import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/db/audit";
import {
  TRANSITIONS,
  TRANSITION_EVENT,
  canTransition,
  isTicketStatus,
  type TicketStatus,
} from "@/lib/domain/constants";
import { dueAtAfterHold } from "@/lib/sla";

// Ticket lifecycle.
// -----------------------------------------------------------------------------
// The single write path for a status change. Validates the edge against the
// state machine, maintains the stop-the-clock fields, and writes exactly one
// audit row — all in one transaction, so an audit gap is impossible.

export interface TransitionInput {
  ticketId: string;
  to: TicketStatus;
  actor: string;
  /** Required when moving to ON_HOLD. */
  holdReason?: string;
  note?: string;
}

export class TransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransitionError";
  }
}

/** Whether this ticket type's SLA runs on business hours. */
async function usesBusinessHours(ticketType: string): Promise<boolean> {
  const rule = await prisma.slaRule.findUnique({
    where: { ticketType },
    select: { businessHoursOnly: true },
  });
  // A ticket type whose rule was deleted keeps its snapshotted dueAt; calendar
  // hours is the conservative fallback (it never extends the clock further
  // than the business-hours walk would).
  return rule?.businessHoursOnly ?? false;
}

export async function transitionTicket(input: TransitionInput): Promise<void> {
  if (!isTicketStatus(input.to)) {
    throw new TransitionError(`"${input.to}" is not a ticket status.`);
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: input.ticketId },
    select: {
      id: true,
      status: true,
      ticketType: true,
      dueAt: true,
      onHoldSince: true,
      holdAccumulatedMinutes: true,
      currentAssigneeId: true,
    },
  });
  if (!ticket) throw new TransitionError(`Ticket ${input.ticketId} not found.`);

  const from = ticket.status as TicketStatus;
  if (from === input.to) return; // idempotent no-op

  if (!canTransition(from, input.to)) {
    throw new TransitionError(`${from} -> ${input.to} is not an allowed transition.`);
  }

  // A ticket cannot be worked by nobody.
  const needsAssignee: TicketStatus[] = ["ASSIGNED", "IN_PROGRESS", "ON_HOLD"];
  if (needsAssignee.includes(input.to) && !ticket.currentAssigneeId) {
    throw new TransitionError(
      `${input.to} requires an assignee; assign the ticket first.`
    );
  }

  if (input.to === "ON_HOLD" && !input.holdReason?.trim()) {
    throw new TransitionError("A hold reason is required to put a ticket ON_HOLD.");
  }

  const now = new Date();
  const data: Prisma.TicketUpdateInput = { status: input.to };
  const details: Record<string, unknown> = {
    from,
    to: input.to,
    note: input.note,
  };

  if (input.to === "ON_HOLD") {
    data.onHoldSince = now;
    data.holdReason = input.holdReason!.trim();
    details.holdReason = data.holdReason;
  }

  // Leaving ON_HOLD: fold the elapsed hold into the accumulator and push dueAt
  // out by the same amount, so time on hold does not burn the SLA budget.
  if (from === "ON_HOLD") {
    const heldMs = ticket.onHoldSince
      ? now.getTime() - ticket.onHoldSince.getTime()
      : 0;
    const heldMinutes = Math.max(0, Math.round(heldMs / 60_000));
    const businessHours = await usesBusinessHours(ticket.ticketType);
    const newDueAt = dueAtAfterHold(ticket.dueAt, heldMinutes, businessHours);

    data.onHoldSince = null;
    data.holdAccumulatedMinutes = ticket.holdAccumulatedMinutes + heldMinutes;
    data.dueAt = newDueAt;
    details.heldMinutes = heldMinutes;
    details.dueAtBefore = ticket.dueAt.toISOString();
    details.dueAtAfter = newDueAt.toISOString();
  }

  if (input.to === "RESOLVED") data.resolvedAt = now;
  if (input.to === "CLOSED") data.closedAt = now;

  // Reopening clears the terminal timestamps so reporting cannot double-count.
  if (from === "RESOLVED" && input.to === "IN_PROGRESS") {
    data.resolvedAt = null;
  }

  // Unassigning (back to NEW) returns the ticket to the pool for the worker.
  if (input.to === "NEW") {
    data.currentAssignee = { disconnect: true };
  }

  const event = TRANSITION_EVENT[`${from}->${input.to}`];
  if (!event) {
    throw new TransitionError(
      `No audit event mapped for ${from} -> ${input.to}.`
    );
  }

  await prisma.$transaction(async (tx) => {
    if (input.to === "NEW") {
      await tx.assignment.updateMany({
        where: { ticketId: ticket.id, unassignedAt: null },
        data: { unassignedAt: now },
      });
    }
    await tx.ticket.update({ where: { id: ticket.id }, data });
    await writeAudit(tx, {
      ticketId: ticket.id,
      actor: input.actor,
      event,
      details,
    });
  });
}

/** Transitions the UI may offer from the current status. */
export function nextStatuses(from: TicketStatus): TicketStatus[] {
  return [...TRANSITIONS[from]];
}
