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

/**
 * Interactive-transaction budget.
 *
 * Prisma's 5s default assumes a database next door. This app can run with the
 * web tier and the database in different regions, where every round-trip costs
 * hundreds of milliseconds, so a transaction of a dozen statements exceeds it
 * and fails with P2028. The real fix is fewer statements inside the
 * transaction - done below, reads now happen outside it - and this is the
 * margin for the writes that remain.
 */
const TX = { timeout: 20_000, maxWait: 15_000 } as const;

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
type Db = Prisma.TransactionClient | typeof prisma;

async function nextTicketFor(
  tx: Db,
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

  // Reads first, outside any transaction: choosing the next ticket needs
  // several queries and none of them need to be atomic. The write below
  // re-checks the ticket it was handed, which is what actually prevents two
  // people starting on the same one.
  const existing = await prisma.workSession.findFirst({
    where: { agentId, endedAt: null },
    select: { id: true },
  });
  if (existing) throw new WorkError("You are already clocked in.");

  const candidateId = await nextTicketFor(prisma, agentId, at);

  return prisma.$transaction(async (tx) => {
    const session = await tx.workSession.create({
      data: { agentId, startedAt: at },
      select: { id: true },
    });

    const claimed = candidateId
      ? await claimTicket(tx, candidateId)
      : false;

    if (claimed && candidateId) {
      await beginTicket(tx, { ticketId: candidateId, agentId, sessionId: session.id, actor, at });
      return { sessionId: session.id, ticketId: candidateId };
    }

    await openActivity(tx, session.id, "IDLE", at);
    return { sessionId: session.id, ticketId: null };
  }, TX);
}

/**
 * Re-assert that a ticket picked outside the transaction is still free.
 *
 * Returns false when someone else took it in the meantime, which the caller
 * treats as "nothing available" rather than an error - the member simply lands
 * idle and can ask again.
 */
async function claimTicket(
  tx: Prisma.TransactionClient,
  ticketId: string
): Promise<boolean> {
  const current = await tx.ticket.findUnique({
    where: { id: ticketId },
    select: { status: true, currentAssigneeId: true },
  });
  return current?.status === "NEW" && current.currentAssigneeId === null;
}

/** Clock out. Closes the open activity and the session. */
export async function stopWork(agentId: string): Promise<void> {
  const at = new Date();
  const session = await prisma.workSession.findFirst({
    where: { agentId, endedAt: null },
    select: { id: true },
  });
  if (!session) throw new WorkError("You are not clocked in.");

  await prisma.$transaction(async (tx) => {
    await closeOpenActivity(tx, session.id, at);
    await tx.workSession.update({ where: { id: session.id }, data: { endedAt: at } });
  }, TX);
}

/** Pull the next ticket on demand (after a resolve, or out of IDLE). */
export async function getNextTicket(
  agentId: string,
  actor: string
): Promise<string | null> {
  const at = new Date();

  const session = await prisma.workSession.findFirst({
    where: { agentId, endedAt: null },
    select: { id: true },
  });
  if (!session) throw new WorkError("Start working before requesting a ticket.");

  const open = await prisma.activityLog.findFirst({
    where: { sessionId: session.id, endedAt: null },
    select: { kind: true },
  });
  if (open?.kind === "TICKET") {
    throw new WorkError("Finish or pause the current ticket first.");
  }

  const candidateId = await nextTicketFor(prisma, agentId, at);
  if (!candidateId) return null;

  return prisma.$transaction(async (tx) => {
    if (!(await claimTicket(tx, candidateId))) return null;
    await closeOpenActivity(tx, session.id, at);
    await beginTicket(tx, { ticketId: candidateId, agentId, sessionId: session.id, actor, at });
    return candidateId;
  }, TX);
}

/** Resolve the ticket in hand, stop its clock, and pull the next one. */
export async function resolveCurrentTicket(
  agentId: string,
  actor: string
): Promise<{ resolvedId: string; nextId: string | null }> {
  const at = new Date();
  const { sessionId, ticketId } = await requireTicketInHand(agentId);

  // Finishing the ticket and picking the next one are two separate concerns, so
  // they are two short transactions rather than one long one. If the process
  // dies between them the ticket is still resolved and the member simply lands
  // with nothing running, which "Get next ticket" recovers.
  await prisma.$transaction(async (tx) => {
    await closeOpenActivity(tx, sessionId, at);
    await tx.assignment.updateMany({
      where: { ticketId, unassignedAt: null },
      data: { unassignedAt: at },
    });
    const ticket = await tx.ticket.update({
      where: { id: ticketId },
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
  }, TX);

  const nextId = await pullNextInto(sessionId, agentId, actor);
  return { resolvedId: ticketId, nextId };
}

/** The open session and the ticket currently running in it, or an error. */
async function requireTicketInHand(
  agentId: string
): Promise<{ sessionId: string; ticketId: string }> {
  const session = await prisma.workSession.findFirst({
    where: { agentId, endedAt: null },
    select: {
      id: true,
      activities: {
        where: { endedAt: null, kind: "TICKET" },
        select: { ticketId: true },
        take: 1,
      },
    },
  });
  const ticketId = session?.activities[0]?.ticketId;
  if (!session || !ticketId) throw new WorkError("You are not working a ticket.");
  return { sessionId: session.id, ticketId };
}

/**
 * Hand the member their next ticket, or leave them idle.
 *
 * The pick is a read and happens outside the transaction; the transaction only
 * re-checks and writes.
 */
async function pullNextInto(
  sessionId: string,
  agentId: string,
  actor: string
): Promise<string | null> {
  const at = new Date();
  const candidateId = await nextTicketFor(prisma, agentId, at);

  return prisma.$transaction(async (tx) => {
    if (candidateId && (await claimTicket(tx, candidateId))) {
      await beginTicket(tx, { ticketId: candidateId, agentId, sessionId, actor, at });
      return candidateId;
    }
    await openActivity(tx, sessionId, "IDLE", at);
    return null;
  }, TX);
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
  const { sessionId, ticketId } = await requireTicketInHand(agentId);

  await prisma.$transaction(async (tx) => {
    await closeOpenActivity(tx, sessionId, at);
    await tx.ticket.update({
      where: { id: ticketId },
      data: { status: "ON_HOLD", onHoldSince: at, holdReason: trimmed },
    });
    await writeAudit(tx, {
      ticketId,
      actor,
      event: "HELD",
      details: { holdReason: trimmed, at: at.toISOString() },
    });
  }, TX);

  const nextId = await pullNextInto(sessionId, agentId, actor);
  return { pendedId: ticketId, nextId };
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
  const session = await prisma.workSession.findFirst({
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

  await prisma.$transaction(async (tx) => {
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
  }, TX);
}

/** Resume a ticket already assigned to this agent (from Pending, or after a break). */
export async function resumeTicket(
  agentId: string,
  ticketId: string,
  actor: string
): Promise<void> {
  const at = new Date();
  const session = await prisma.workSession.findFirst({
    where: { agentId, endedAt: null },
    select: { id: true },
  });
  if (!session) throw new WorkError("Start working before resuming a ticket.");

  await prisma.$transaction(async (tx) => {
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
  }, TX);
}
