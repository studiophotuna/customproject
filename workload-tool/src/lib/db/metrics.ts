import { prisma } from "@/lib/db/prisma";
import { OPEN_STATUSES } from "@/lib/domain/constants";
import {
  ACTIVITY_KINDS,
  PRODUCTIVE_KINDS,
  isProductive,
  timelinessPct,
  utilizationPct,
  type ActivityKind,
} from "@/lib/domain/work";
import { dailyTargetHours, readSettings } from "@/lib/db/settings";

// Measured numbers, derived from ActivityLog and ticket outcomes.
//
// An activity that is still open is counted up to `asOf`, so a running timer
// contributes to today's utilization instead of appearing only once closed.

export function startOfDay(d = new Date()): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function seconds(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / 1000);
}

export interface AgentUtilization {
  agentId: string;
  displayName: string;
  adUpn: string;
  role: string;
  byKind: Record<ActivityKind, number>;
  productiveSeconds: number;
  loggedSeconds: number;
  utilization: number;
  targetHours: number;
  clockedIn: boolean;
  currentKind: ActivityKind | null;
  openTickets: number;
  concurrentCap: number;
}

/** Per-agent utilization for a day. Open activities count up to `asOf`. */
export async function utilizationFor(
  from: Date = startOfDay(),
  asOf: Date = new Date()
): Promise<AgentUtilization[]> {
  const settings = await readSettings();
  const targetHours = dailyTargetHours(settings);

  const agents = await prisma.agent.findMany({
    where: { active: true },
    select: {
      id: true,
      adUpn: true,
      displayName: true,
      role: true,
      concurrentCap: true,
      _count: {
        select: { currentTickets: { where: { status: { in: [...OPEN_STATUSES] } } } },
      },
      workSessions: {
        where: { startedAt: { lte: asOf }, OR: [{ endedAt: null }, { endedAt: { gte: from } }] },
        select: {
          id: true,
          endedAt: true,
          activities: {
            where: { startedAt: { lte: asOf } },
            select: { kind: true, startedAt: true, endedAt: true },
          },
        },
      },
    },
    orderBy: { displayName: "asc" },
  });

  return agents.map((agent) => {
    const byKind = Object.fromEntries(
      ACTIVITY_KINDS.map((k) => [k, 0])
    ) as Record<ActivityKind, number>;

    let clockedIn = false;
    let currentKind: ActivityKind | null = null;

    for (const session of agent.workSessions) {
      if (session.endedAt === null) clockedIn = true;
      for (const activity of session.activities) {
        const kind = activity.kind as ActivityKind;
        // Clip to the window so a session spanning midnight is attributed fairly.
        const begin = activity.startedAt < from ? from : activity.startedAt;
        const end = activity.endedAt ?? asOf;
        if (end <= begin) continue;
        byKind[kind] = (byKind[kind] ?? 0) + seconds(begin, end);
        if (activity.endedAt === null && session.endedAt === null) currentKind = kind;
      }
    }

    const productiveSeconds = PRODUCTIVE_KINDS.reduce((sum, k) => sum + byKind[k], 0);
    const loggedSeconds = ACTIVITY_KINDS.reduce((sum, k) => sum + byKind[k], 0);

    return {
      agentId: agent.id,
      displayName: agent.displayName,
      adUpn: agent.adUpn,
      role: agent.role,
      byKind,
      productiveSeconds,
      loggedSeconds,
      utilization: utilizationPct({ productiveSeconds, dailyTargetHours: targetHours }),
      targetHours,
      clockedIn,
      currentKind,
      openTickets: agent._count.currentTickets,
      concurrentCap: agent.concurrentCap,
    };
  });
}

export interface TimelinessSummary {
  resolved: number;
  onTime: number;
  breached: number;
  pct: number;
  avgHandleSeconds: number;
}

/** Timeliness of tickets resolved in the window, against their snapshotted SLA. */
export async function timelinessFor(
  from: Date = startOfDay(),
  to: Date = new Date()
): Promise<TimelinessSummary> {
  const resolved = await prisma.ticket.findMany({
    where: { resolvedAt: { gte: from, lte: to } },
    select: { id: true, dueAt: true, resolvedAt: true },
  });

  let onTime = 0;
  for (const t of resolved) {
    if (t.resolvedAt && t.resolvedAt.getTime() <= t.dueAt.getTime()) onTime++;
  }

  // Handle time is the sum of TICKET activity on those tickets — real worked
  // time, not wall-clock from receipt, so pauses and holds do not inflate it.
  const ids = resolved.map((t) => t.id);
  let handleSeconds = 0;
  if (ids.length > 0) {
    const activities = await prisma.activityLog.findMany({
      where: { kind: "TICKET", ticketId: { in: ids }, endedAt: { not: null } },
      select: { startedAt: true, endedAt: true },
    });
    for (const a of activities) {
      if (a.endedAt) handleSeconds += seconds(a.startedAt, a.endedAt);
    }
  }

  return {
    resolved: resolved.length,
    onTime,
    breached: resolved.length - onTime,
    pct: timelinessPct(onTime, resolved.length),
    avgHandleSeconds: resolved.length ? Math.round(handleSeconds / resolved.length) : 0,
  };
}

/** Worked seconds on one ticket, including a currently running timer. */
export async function handleSecondsFor(
  ticketId: string,
  asOf: Date = new Date()
): Promise<number> {
  const rows = await prisma.activityLog.findMany({
    where: { ticketId, kind: "TICKET" },
    select: { startedAt: true, endedAt: true },
  });
  return Math.round(
    rows.reduce((sum, r) => sum + seconds(r.startedAt, r.endedAt ?? asOf), 0)
  );
}

export interface DashboardStats {
  openTickets: number;
  awaitingAllocation: number;
  slaAtRisk: number;
  breached: number;
  teamUtilization: number;
  timeliness: TimelinessSummary;
  clockedIn: number;
  headcount: number;
}

export async function dashboardStats(asOf: Date = new Date()): Promise<DashboardStats> {
  const soon = new Date(asOf.getTime() + 60 * 60 * 1000);

  const [openTickets, awaitingAllocation, slaAtRisk, breached, util, timeliness] =
    await Promise.all([
      prisma.ticket.count({ where: { status: { in: [...OPEN_STATUSES] } } }),
      prisma.ticket.count({ where: { status: "NEW", currentAssigneeId: null } }),
      prisma.ticket.count({
        where: {
          status: { in: [...OPEN_STATUSES, "NEW"] },
          dueAt: { gt: asOf, lte: soon },
        },
      }),
      prisma.ticket.count({
        where: { status: { in: [...OPEN_STATUSES, "NEW"] }, dueAt: { lte: asOf } },
      }),
      utilizationFor(startOfDay(asOf), asOf),
      timelinessFor(startOfDay(asOf), asOf),
    ]);

  // Team utilization averages only those who actually clocked in today; including
  // people who never started would report a team as idle rather than absent.
  const active = util.filter((u) => u.loggedSeconds > 0);
  const teamUtilization = active.length
    ? Math.round((active.reduce((s, u) => s + u.utilization, 0) / active.length) * 10) / 10
    : 0;

  return {
    openTickets,
    awaitingAllocation,
    slaAtRisk,
    breached,
    teamUtilization,
    timeliness,
    clockedIn: util.filter((u) => u.clockedIn).length,
    headcount: util.length,
  };
}

export { isProductive };
