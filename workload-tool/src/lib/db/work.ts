import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/db/audit";
import {
  ORDERING_STRATEGIES,
  isAvailable,
  type QueueTicket,
} from "@/lib/allocation/allocation-engine";
import { configFromEnv } from "@/lib/allocation/run";
import { OPEN_STATUSES, PENDING_STATUSES } from "@/lib/domain/constants";
import { isActivityKind, type ActivityKind } from "@/lib/domain/work";
import { getScheduler } from "@/lib/scheduler/stub";
import { dueAtAfterHold } from "@/lib/sla";

// The work console: what happens when a member presses Start working, finishes
// a ticket, pauses one, or changes what they are doing.
//
// Allocation here is PULL, not push: a member asks for work and gets the single
// next ticket. The ordering is the same engine strategy the background worker
// uses (priority-banded FIFO by default), so both paths agree on what "next"
// means — a member cannot cherry-pick, and the queue order is the SLA order.

export class WorkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkError";
  }
}

export interface CurrentState {
  sessionId: string | null;
  sessionStartedAt: Date | null;
  activityId: string | null;
  activityKind: ActivityKind | null;
  activityStartedAt: Date | null;
  ticket: {
    id: string;
    subject: string;
    ticketType: string;
    receivedAt: Date;
    dueAt: Date;
    status: string;
    body: string | null;
  } | null;
}

/** The member's open session and what they are currently doing. */
export async function currentState(agentId: string): Promise<CurrentState> {
  const session = await prisma.workSession.findFirst({
    where: { agentId, endedAt: null },
    orderBy: { startedAt: "desc" },
    select: {
      id: true,
      startedAt: true,
      activities: {
        where: { endedAt: null },
        orderBy: { startedAt: "desc" },
        take: 1,
        select: {
          id: true,
          kind: true,
          startedAt: true,
          ticket: {
            select: {
              id: true,
              subject: true,
              ticketType: true,
              receivedAt: true,
              dueAt: true,
              status: true,
              body: true,
            },
          },
        },
      },
    },
  });

  if (!session) {
    return {
      sessionId: null,
      sessionStartedAt: null,
      activityId: null,
      activityKind: null,
      activityStartedAt: null,
      ticket: null,
    };
  }

  const activity = session.activities[0];
  return {
    sessionId: session.id,
    sessionStartedAt: session.startedAt,
    activityId: activity?.id ?? null,
    activityKind: (activity?.kind as ActivityKind | undefined) ?? null,
    activityStartedAt: activity?.startedAt ?? null,
    ticket: activity?.ticket ?? null,
  };
}

/** Close whatever activity is open in this session. Safe to call when none is. */
async function closeOpenActivity(
  tx: Prisma.TransactionClient,
  sessionId: string,
  at: Date
): Promise<void> {
  await tx.activityLog.updateMany({
    where: { sessionId, endedAt: null },
    data: { endedAt: at },
  });
}

async function openActivity(
  tx: Prisma.TransactionClient,
  sessionId: string,
  kind: ActivityKind,
  at: Date,
  ticketId?: string,
  note?: string
): Promise<void> {
  await tx.activityLog.create({
    data: { sessionId, kind, ticketId: ticketId ?? null, startedAt: at, note: note ?? null },
  });
}

/**
 * The next ticket this agent should work, by the configured ordering.
 * Returns null when the queue is empty or the agent cannot take more work.
 */
async function nextTicketFor(
  tx: Prisma.TransactionClient,
  agentId: string,
  at: Date
): Promise<string | null> {
  const agent = await tx.agent.findUnique({
    where: { id: agentId },
    select: {
      id: true,
      adUpn: true,
      concurrentCap: true,
      active: true,
      shifts: {
        where: { startsAt: { lte: at }, endsAt: { gt: at } },
        select: { id: true },
        take: 1,
      },
      _count: {
        select: { currentTickets: { where: { status: { in: [...OPEN_STATUSES] } } } },
      },
    },
  });
  if (!agent || !agent.active) return null;

  const blocked = await getScheduler().blockedUpns(at, [agent.adUpn]);

  // Same availability rule the background worker applies — one definition.
  const eligible = isAvailable({
    id: agent.id,
    onShiftNow: agent.shifts.length > 0,
    onLeaveOrWfhBlocked: blocked.has(agent.adUpn.toLowerCase()),
    openTicketCount: agent._count.currentTickets,
    concurrentCap: agent.concurrentCap,
  });
  if (!eligible) return null;

  const pending = await tx.ticket.findMany({
    where: { status: { in: [...PENDING_STATUSES] }, currentAssigneeId: null },
    select: { id: true, receivedAt: true, dueAt: true },
  });
  if (pending.length === 0) return null;

  const order = ORDERING_STRATEGIES[configFromEnv().ordering];
  const queue: QueueTicket[] = pending.map((t) => ({
    id: t.id,
    receivedAt: t.receivedAt,
    dueAt: t.dueAt,
  }));
  return order(queue)[0]?.id ?? null;
}

/** Assign `ticketId` to the agent and put them to work on it, inside `tx`. */
async function beginTicket(
  tx: Prisma.TransactionClient,
  opts: {
    ticketId: string;
    agentId: string;
    sessionId: string;
    actor: string;
    at: Date;
  }
): Promise<void> {
  const ticket = await tx.ticket.findUnique({
    where: { id: opts.ticketId },
    select: { id: true, status: true, startedAt: true, currentAssigneeId: true },
  });
  if (!ticket) throw new WorkError("That ticket no longer exists.");

  const firstTouch = ticket.startedAt === null;

  await tx.assignment.updateMany({
    where: { ticketId: ticket.id, unassignedAt: null },
    data: { unassignedAt: opts.at },
  });
  await tx.assignment.create({
    data: { ticketId: ticket.id, agentId: opts.agentId, reason: "AUTO", assignedAt: opts.at },
  });
  await tx.ticket.update({
    where: { id: ticket.id },
    data: {
      currentAssigneeId: opts.agentId,
      status: "IN_PROGRESS",
      startedAt: firstTouch ? opts.at : ticket.startedAt,
      // Resuming a paused ticket folds the hold into the clock.
      ...(ticket.status === "ON_HOLD" ? { onHoldSince: null } : {}),
    },
  });

  await writeAudit(tx, {
    ticketId: ticket.id,
    actor: opts.actor,
    event: ticket.currentAssigneeId ? "STARTED" : "ASSIGNED",
    details: {
      to: opts.agentId,
      via: "work console pull",
      previousStatus: ticket.status,
    },
  });

  await openActivity(tx, opts.sessionId, "TICKET", opts.at, ticket.id);
}

export interface StartResult {
  sessionId: string;
  ticketId: string | null;
}

/**
 * Start working. Opens a session and immediately pulls the first ticket, so the
 * member never chooses what to work on. With nothing in the queue they land in
 * IDLE and can press "Get next ticket" later.
 */
export async function startWork(agentId: string, actor: string): Promise<StartResult> {
  const at = new Date();

  return prisma.$transaction(async (tx) => {
    const existing = await tx.workSession.findFirst({
      where: { agentId, endedAt: null },
      select: { id: true },
    });
    if (existing) throw new WorkError("You are already clocked in.");

    const session = await tx.workSession.create({
      data: { agentId, startedAt: at },
      select: { id: true },
    });

    const ticketId = await nextTicketFor(tx, agentId, at);
    if (ticketId) {
      await beginTicket(tx, { ticketId, agentId, sessionId: session.id, actor, at });
    } else {
      await openActivity(tx, session.id, "IDLE", at);
    }

    return { sessionId: session.id, ticketId };
  });
}

/** Clock out. Closes the open activity and the session. */
export async function stopWork(agentId: string): Promise<void> {
  const at = new Date();
  await prisma.$transaction(async (tx) => {
    const session = await tx.workSession.findFirst({
      where: { agentId, endedAt: null },
      select: { id: true },
    });
    if (!session) throw new WorkError("You are not clocked in.");

    await closeOpenActivity(tx, session.id, at);
    await tx.workSession.update({ where: { id: session.id }, data: { endedAt: at } });
  });
}

/** Pull the next ticket on demand (after a resolve, or out of IDLE). */
export async function getNextTicket(
  agentId: string,
  actor: string
): Promise<string | null> {
  const at = new Date();
  return prisma.$transaction(async (tx) => {
    const session = await tx.workSession.findFirst({
      where: { agentId, endedAt: null },
      select: { id: true },
    });
    if (!session) throw new WorkError("Start working before requesting a ticket.");

    const open = await tx.activityLog.findFirst({
      where: { sessionId: session.id, endedAt: null },
      select: { kind: true },
    });
    if (open?.kind === "TICKET") {
      throw new WorkError("Finish or pause the current ticket first.");
    }

    const ticketId = await nextTicketFor(tx, agentId, at);
    if (!ticketId) return null;

    await closeOpenActivity(tx, session.id, at);
    await beginTicket(tx, { ticketId, agentId, sessionId: session.id, actor, at });
    return ticketId;
  });
}

/** Resolve the ticket in hand, stop its clock, and pull the next one. */
export async function resolveCurrentTicket(
  agentId: string,
  actor: string
): Promise<{ resolvedId: string; nextId: string | null }> {
  const at = new Date();
  return prisma.$transaction(async (tx) => {
    const session = await tx.workSession.findFirst({
      where: { agentId, endedAt: null },
      select: {
        id: true,
        activities: {
          where: { endedAt: null, kind: "TICKET" },
          select: { id: true, ticketId: true },
          take: 1,
        },
      },
    });
    const activity = session?.activities[0];
    if (!session || !activity?.ticketId) {
      throw new WorkError("You are not working a ticket.");
    }

    await closeOpenActivity(tx, session.id, at);
    await tx.assignment.updateMany({
      where: { ticketId: activity.ticketId, unassignedAt: null },
      data: { unassignedAt: at },
    });
    const ticket = await tx.ticket.update({
      where: { id: activity.ticketId },
      data: { status: "RESOLVED", resolvedAt: at, onHoldSince: null },
      select: { id: true, dueAt: true },
    });

    await writeAudit(tx, {
      ticketId: ticket.id,
      actor,
      event: "RESOLVED",
      details: {
        resolvedAt: at.toISOString(),
        dueAt: ticket.dueAt.toISOString(),
        onTime: at.getTime() <= ticket.dueAt.getTime(),
      },
    });

    const nextId = await nextTicketFor(tx, agentId, at);
    if (nextId) {
      await beginTicket(tx, { ticketId: nextId, agentId, sessionId: session.id, actor, at });
    } else {
      await openActivity(tx, session.id, "IDLE", at);
    }

    return { resolvedId: ticket.id, nextId };
  });
}

/**
 * Park the ticket in hand as Pending with a reason, then pull the next one.
 * The reason is required — a pending ticket without one is unactionable later.
 */
export async function pendCurrentTicket(
  agentId: string,
  actor: string,
  reason: string
): Promise<{ pendedId: string; nextId: string | null }> {
  const trimmed = reason.trim();
  if (!trimmed) throw new WorkError("A reason is required to mark a ticket pending.");

  const at = new Date();
  return prisma.$transaction(async (tx) => {
    const session = await tx.workSession.findFirst({
      where: { agentId, endedAt: null },
      select: {
        id: true,
        activities: {
          where: { endedAt: null, kind: "TICKET" },
          select: { id: true, ticketId: true },
          take: 1,
        },
      },
    });
    const activity = session?.activities[0];
    if (!session || !activity?.ticketId) {
      throw new WorkError("You are not working a ticket.");
    }

    await closeOpenActivity(tx, session.id, at);
    const ticket = await tx.ticket.update({
      where: { id: activity.ticketId },
      data: { status: "ON_HOLD", onHoldSince: at, holdReason: trimmed },
      select: { id: true },
    });

    await writeAudit(tx, {
      ticketId: ticket.id,
      actor,
      event: "HELD",
      details: { holdReason: trimmed, at: at.toISOString() },
    });

    const nextId = await nextTicketFor(tx, agentId, at);
    if (nextId) {
      await beginTicket(tx, { ticketId: nextId, agentId, sessionId: session.id, actor, at });
    } else {
      await openActivity(tx, session.id, "IDLE", at);
    }

    return { pendedId: ticket.id, nextId };
  });
}

/**
 * Switch to a non-ticket activity (break, meeting, adhoc…).
 * A ticket in hand keeps its assignment and IN_PROGRESS status — only its clock
 * stops, which is what makes handle time exclude time spent elsewhere.
 */
export async function setActivity(
  agentId: string,
  kind: string,
  actor: string,
  note?: string
): Promise<void> {
  if (!isActivityKind(kind) || kind === "TICKET") {
    throw new WorkError(`"${kind}" is not a selectable activity.`);
  }

  const at = new Date();
  await prisma.$transaction(async (tx) => {
    const session = await tx.workSession.findFirst({
      where: { agentId, endedAt: null },
      select: {
        id: true,
        activities: {
          where: { endedAt: null },
          select: { kind: true, ticketId: true },
          take: 1,
        },
      },
    });
    if (!session) throw new WorkError("Start working before changing activity.");

    const open = session.activities[0];
    await closeOpenActivity(tx, session.id, at);

    if (open?.kind === "TICKET" && open.ticketId) {
      await writeAudit(tx, {
        ticketId: open.ticketId,
        actor,
        event: "HELD",
        details: { pausedFor: kind, note, at: at.toISOString() },
      });
    }

    await openActivity(tx, session.id, kind, at, undefined, note);
  });
}

/** Resume a ticket already assigned to this agent (from Pending, or after a break). */
export async function resumeTicket(
  agentId: string,
  ticketId: string,
  actor: string
): Promise<void> {
  const at = new Date();
  await prisma.$transaction(async (tx) => {
    const session = await tx.workSession.findFirst({
      where: { agentId, endedAt: null },
      select: { id: true },
    });
    if (!session) throw new WorkError("Start working before resuming a ticket.");

    const ticket = await tx.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        status: true,
        currentAssigneeId: true,
        onHoldSince: true,
        holdAccumulatedMinutes: true,
        dueAt: true,
        ticketType: true,
      },
    });
    if (!ticket) throw new WorkError("That ticket no longer exists.");
    if (ticket.currentAssigneeId !== agentId) {
      throw new WorkError("That ticket is not assigned to you.");
    }
    if (ticket.status === "CLOSED" || ticket.status === "RESOLVED") {
      throw new WorkError("That ticket is already finished.");
    }

    // Coming off hold, push the due time out by the time spent held.
    let dueAt = ticket.dueAt;
    let holdMinutes = ticket.holdAccumulatedMinutes;
    if (ticket.status === "ON_HOLD" && ticket.onHoldSince) {
      const held = Math.max(
        0,
        Math.round((at.getTime() - ticket.onHoldSince.getTime()) / 60_000)
      );
      const rule = await tx.slaRule.findUnique({
        where: { ticketType: ticket.ticketType },
        select: { businessHoursOnly: true },
      });
      dueAt = dueAtAfterHold(ticket.dueAt, held, rule?.businessHoursOnly ?? false);
      holdMinutes += held;
    }

    await closeOpenActivity(tx, session.id, at);
    await tx.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "IN_PROGRESS",
        onHoldSince: null,
        holdAccumulatedMinutes: holdMinutes,
        dueAt,
        startedAt: ticket.status === "ON_HOLD" ? undefined : at,
      },
    });
    await writeAudit(tx, {
      ticketId: ticket.id,
      actor,
      event: "RESUMED",
      details: { at: at.toISOString(), dueAt: dueAt.toISOString() },
    });
    await openActivity(tx, session.id, "TICKET", at, ticket.id);
  });
}
