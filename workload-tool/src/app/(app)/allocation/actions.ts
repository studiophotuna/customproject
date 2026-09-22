"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { assignWithin } from "@/lib/tickets/assign";

export interface OverrideState {
  error?: string;
  ok?: string;
}

/**
 * Leader manual override / reassignment.
 *
 * Deliberately allowed to exceed an agent's concurrent cap: a leader overriding
 * the allocator is making a judgement the allocator cannot. The cap is reported
 * as information, and the override is recorded in the audit trail either way.
 */
export async function overrideAssignmentAction(
  _previous: OverrideState,
  formData: FormData
): Promise<OverrideState> {
  const identity = await requireRole("LEADER");

  const ticketId = String(formData.get("ticketId") ?? "");
  const agentId = String(formData.get("agentId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  if (!ticketId || !agentId) return { error: "Pick an agent first." };

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { id: true, status: true, currentAssigneeId: true, subject: true },
  });
  if (!ticket) return { error: "Ticket not found." };
  if (ticket.status === "CLOSED") return { error: "Closed tickets cannot be reassigned." };
  if (ticket.currentAssigneeId === agentId) {
    return { error: "That agent already holds this ticket." };
  }

  const wasAssigned = ticket.currentAssigneeId !== null;

  try {
    await prisma.$transaction(async (tx) => {
      await assignWithin(tx, {
        ticketId: ticket.id,
        agentId,
        actor: identity.upn,
        reason: wasAssigned ? "REASSIGN" : "MANUAL_OVERRIDE",
        note: note || undefined,
      });
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Override failed." };
  }

  revalidatePath("/allocation");
  revalidatePath("/tickets");
  revalidatePath("/");
  return { ok: `${ticket.subject} reassigned.` };
}
