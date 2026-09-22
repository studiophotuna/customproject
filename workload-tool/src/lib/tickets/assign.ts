import { writeAudit, type Db } from "@/lib/db/audit";
import type { AssignmentReason } from "@/lib/domain/constants";

// Assignment writes.
// -----------------------------------------------------------------------------
// Assignment is a trail, not an overwrite: the open Assignment row is closed
// (unassignedAt) and a new one opened. Ticket.currentAssigneeId is the fast
// lookup; the Assignment table is the history.

export interface AssignInput {
  ticketId: string;
  agentId: string;
  actor: string;
  reason: AssignmentReason;
  /** Extra context for the audit row (e.g. why a leader overrode the plan). */
  note?: string;
}

/**
 * Give a ticket to an agent inside an existing transaction.
 * Moves NEW -> ASSIGNED; leaves a ticket already in flight in its current
 * status so a reassignment mid-work does not reset progress.
 */
export async function assignWithin(db: Db, input: AssignInput): Promise<void> {
  const ticket = await db.ticket.findUnique({
    where: { id: input.ticketId },
    select: { id: true, status: true, currentAssigneeId: true },
  });
  if (!ticket) throw new Error(`Ticket ${input.ticketId} not found.`);

  const agent = await db.agent.findUnique({
    where: { id: input.agentId },
    select: { id: true, adUpn: true, active: true },
  });
  if (!agent) throw new Error(`Agent ${input.agentId} not found.`);
  if (!agent.active) {
    throw new Error(`Agent ${agent.adUpn} is inactive and cannot take tickets.`);
  }

  const previousAssigneeId = ticket.currentAssigneeId;
  if (previousAssigneeId === input.agentId) return; // already theirs; no-op

  // Close the outgoing assignment, if any.
  if (previousAssigneeId) {
    await db.assignment.updateMany({
      where: { ticketId: ticket.id, unassignedAt: null },
      data: { unassignedAt: new Date() },
    });
  }

  await db.assignment.create({
    data: {
      ticketId: ticket.id,
      agentId: input.agentId,
      reason: input.reason,
    },
  });

  await db.ticket.update({
    where: { id: ticket.id },
    data: {
      currentAssigneeId: input.agentId,
      status: ticket.status === "NEW" ? "ASSIGNED" : ticket.status,
    },
  });

  const isReassignment = previousAssigneeId !== null;
  await writeAudit(db, {
    ticketId: ticket.id,
    actor: input.actor,
    event:
      input.reason === "MANUAL_OVERRIDE"
        ? "OVERRIDE"
        : isReassignment
          ? "REASSIGNED"
          : "ASSIGNED",
    details: {
      from: previousAssigneeId,
      to: input.agentId,
      reason: input.reason,
      statusBefore: ticket.status,
      statusAfter: ticket.status === "NEW" ? "ASSIGNED" : ticket.status,
      note: input.note,
    },
  });
}
