import { prisma } from "@/lib/db/prisma";
import { OPEN_STATUSES, COMPLEXITIES, type Complexity } from "@/lib/domain/constants";
import { PRODUCTIVE_KINDS, type ActivityKind } from "@/lib/domain/work";
import { startOfDay } from "@/lib/db/metrics";

// Admin analytics.
//
// Everything here is read-only aggregation over what the app already records.
// Nothing in this module feeds allocation — in particular `complexity` is
// reported on but never returned to the allocator.

export interface DayPoint {
  date: Date;
  label: string;
  received: number;
  resolved: number;
  onTime: number;
  breached: number;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Inbound vs cleared per day — the shape of the team's Outlook volume. */
export async function volumeByDay(days = 14, asOf = new Date()): Promise<DayPoint[]> {
  const from = startOfDay(new Date(asOf.getTime() - (days - 1) * 86_400_000));

  const [received, resolved] = await Promise.all([
    prisma.ticket.findMany({
      where: { receivedAt: { gte: from, lte: asOf } },
      select: { receivedAt: true },
    }),
    prisma.ticket.findMany({
      where: { resolvedAt: { gte: from, lte: asOf } },
      select: { resolvedAt: true, dueAt: true },
    }),
  ]);

  const buckets = new Map<string, DayPoint>();
  for (let i = 0; i < days; i++) {
    const d = startOfDay(new Date(from.getTime() + i * 86_400_000));
    buckets.set(dayKey(d), {
      date: d,
      label: d.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      received: 0,
      resolved: 0,
      onTime: 0,
      breached: 0,
    });
  }

  for (const t of received) {
    const b = buckets.get(dayKey(t.receivedAt));
    if (b) b.received++;
  }
  for (const t of resolved) {
    if (!t.resolvedAt) continue;
    const b = buckets.get(dayKey(t.resolvedAt));
    if (!b) continue;
    b.resolved++;
    if (t.resolvedAt.getTime() <= t.dueAt.getTime()) b.onTime++;
    else b.breached++;
  }

  return [...buckets.values()];
}

export interface HourPoint {
  hour: number;
  label: string;
  count: number;
}

/**
 * Arrival profile by hour of day.
 *
 * This is the one an admin plans staffing against: it shows when the mailbox
 * actually fills up, which is rarely uniform across a shift.
 */
export async function volumeByHour(days = 30, asOf = new Date()): Promise<HourPoint[]> {
  const from = startOfDay(new Date(asOf.getTime() - (days - 1) * 86_400_000));
  const rows = await prisma.ticket.findMany({
    where: { receivedAt: { gte: from, lte: asOf } },
    select: { receivedAt: true },
  });

  const counts = new Array(24).fill(0) as number[];
  for (const r of rows) counts[r.receivedAt.getHours()]++;

  return counts.map((count, hour) => ({
    hour,
    label: `${String(hour).padStart(2, "0")}`,
    count,
  }));
}

export interface ComplexityRow {
  complexity: Complexity;
  total: number;
  resolved: number;
  avgHandleSeconds: number;
  onTimePct: number;
}

/**
 * Volume and effort per complexity band.
 *
 * Reporting only. Complexity does not change who gets a ticket or when — this
 * table exists so the effect of that policy can be measured rather than assumed.
 */
export async function byComplexity(days = 30, asOf = new Date()): Promise<ComplexityRow[]> {
  const from = startOfDay(new Date(asOf.getTime() - (days - 1) * 86_400_000));

  const tickets = await prisma.ticket.findMany({
    where: { receivedAt: { gte: from, lte: asOf } },
    select: { id: true, complexity: true, resolvedAt: true, dueAt: true },
  });

  // Durations are summed in JS rather than by groupBy: the value is the gap
  // between two columns, which SQL groupBy cannot aggregate directly.
  const spans = await prisma.activityLog.findMany({
    where: {
      kind: "TICKET",
      endedAt: { not: null },
      ticketId: { in: tickets.map((t) => t.id) },
    },
    select: { ticketId: true, startedAt: true, endedAt: true },
  });

  const secondsByTicket = new Map<string, number>();
  for (const s of spans) {
    if (!s.ticketId || !s.endedAt) continue;
    const secs = Math.max(0, (s.endedAt.getTime() - s.startedAt.getTime()) / 1000);
    secondsByTicket.set(s.ticketId, (secondsByTicket.get(s.ticketId) ?? 0) + secs);
  }

  return COMPLEXITIES.map((complexity) => {
    const rows = tickets.filter((t) => t.complexity === complexity);
    const done = rows.filter((t) => t.resolvedAt !== null);
    const onTime = done.filter(
      (t) => t.resolvedAt && t.resolvedAt.getTime() <= t.dueAt.getTime()
    ).length;
    const worked = done
      .map((t) => secondsByTicket.get(t.id) ?? 0)
      .filter((s) => s > 0);

    return {
      complexity,
      total: rows.length,
      resolved: done.length,
      avgHandleSeconds: worked.length
        ? Math.round(worked.reduce((a, b) => a + b, 0) / worked.length)
        : 0,
      onTimePct: done.length ? Math.round((onTime / done.length) * 1000) / 10 : 0,
    };
  });
}

export interface ReasonRow {
  reason: string;
  count: number;
}

/**
 * Most frequent pending reasons.
 *
 * Free text today. This ranking is exactly the evidence needed to turn it into
 * the picklist the brief anticipates — the top entries become the options.
 */
export async function topPendingReasons(limit = 8, days = 30, asOf = new Date()): Promise<ReasonRow[]> {
  const from = startOfDay(new Date(asOf.getTime() - (days - 1) * 86_400_000));
  const rows = await prisma.auditLog.findMany({
    where: { event: "HELD", at: { gte: from, lte: asOf }, detailsJson: { not: null } },
    select: { detailsJson: true },
  });

  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.detailsJson) continue;
    let reason: string | undefined;
    try {
      reason = (JSON.parse(row.detailsJson) as { holdReason?: string }).holdReason;
    } catch {
      continue;
    }
    if (!reason) continue;
    // Normalise lightly so "Waiting on HR" and "waiting on hr " group together.
    const key = reason.trim().replace(/\s+/g, " ");
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count || a.reason.localeCompare(b.reason))
    .slice(0, limit);
}

export interface BacklogRow {
  status: string;
  count: number;
  oldestReceivedAt: Date | null;
}

/** What is sitting in the queue right now, and how long the oldest has waited. */
export async function backlog(): Promise<BacklogRow[]> {
  const rows = await prisma.ticket.findMany({
    where: { status: { in: ["NEW", ...OPEN_STATUSES] } },
    select: { status: true, receivedAt: true },
  });

  const grouped = new Map<string, BacklogRow>();
  for (const r of rows) {
    const existing = grouped.get(r.status) ?? {
      status: r.status,
      count: 0,
      oldestReceivedAt: null,
    };
    existing.count++;
    if (!existing.oldestReceivedAt || r.receivedAt < existing.oldestReceivedAt) {
      existing.oldestReceivedAt = r.receivedAt;
    }
    grouped.set(r.status, existing);
  }

  return ["NEW", ...OPEN_STATUSES].map(
    (status) => grouped.get(status) ?? { status, count: 0, oldestReceivedAt: null }
  );
}

export interface TypeRow {
  ticketType: string;
  received: number;
  breached: number;
}

/** Volume and breaches per request type — which SLA rules are under strain. */
export async function byTicketType(days = 30, asOf = new Date()): Promise<TypeRow[]> {
  const from = startOfDay(new Date(asOf.getTime() - (days - 1) * 86_400_000));
  const rows = await prisma.ticket.findMany({
    where: { receivedAt: { gte: from, lte: asOf } },
    select: { ticketType: true, resolvedAt: true, dueAt: true, status: true },
  });

  const grouped = new Map<string, TypeRow>();
  for (const r of rows) {
    const t = grouped.get(r.ticketType) ?? {
      ticketType: r.ticketType,
      received: 0,
      breached: 0,
    };
    t.received++;
    const late = r.resolvedAt
      ? r.resolvedAt.getTime() > r.dueAt.getTime()
      : r.status !== "CLOSED" && r.dueAt.getTime() < asOf.getTime();
    if (late) t.breached++;
    grouped.set(r.ticketType, t);
  }

  return [...grouped.values()].sort((a, b) => b.received - a.received);
}

/** Productive seconds per activity kind across the team, for a period. */
export async function activityMix(days = 7, asOf = new Date()): Promise<
  { kind: ActivityKind; seconds: number; productive: boolean }[]
> {
  const from = startOfDay(new Date(asOf.getTime() - (days - 1) * 86_400_000));
  const rows = await prisma.activityLog.findMany({
    where: { startedAt: { gte: from, lte: asOf } },
    select: { kind: true, startedAt: true, endedAt: true },
  });

  const totals = new Map<string, number>();
  for (const r of rows) {
    const end = r.endedAt ?? asOf;
    const secs = Math.max(0, (end.getTime() - r.startedAt.getTime()) / 1000);
    totals.set(r.kind, (totals.get(r.kind) ?? 0) + secs);
  }

  return [...totals.entries()]
    .map(([kind, seconds]) => ({
      kind: kind as ActivityKind,
      seconds: Math.round(seconds),
      productive: (PRODUCTIVE_KINDS as readonly string[]).includes(kind),
    }))
    .sort((a, b) => b.seconds - a.seconds);
}
