"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { hasAtLeast, isTicketStatus } from "@/lib/domain/constants";
import { TransitionError, transitionTicket } from "@/lib/tickets/lifecycle";

export interface TransitionState {
  error?: string;
}

/**
 * Move a ticket through the lifecycle.
 *
 * A MEMBER may only move tickets currently assigned to them; LEADER and above
 * may move any ticket. The check reads the row rather than trusting the form,
 * because a Server Action is a public POST endpoint.
 */
export async function transitionAction(
  _previous: TransitionState,
  formData: FormData
): Promise<TransitionState> {
  const identity = await requireRole("MEMBER");

  const ticketId = String(formData.get("ticketId") ?? "");
  const to = String(formData.get("to") ?? "");
  const holdReason = String(formData.get("holdReason") ?? "");

  if (!ticketId || !isTicketStatus(to)) {
    return { error: "Invalid transition request." };
  }

  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { currentAssigneeId: true },
  });
  if (!ticket) return { error: "Ticket not found." };

  const ownsTicket =
    identity.agentId !== null && ticket.currentAssigneeId === identity.agentId;
  if (!hasAtLeast(identity.role, "LEADER") && !ownsTicket) {
    return { error: "You can only update tickets assigned to you." };
  }

  try {
    await transitionTicket({
      ticketId,
      to,
      actor: identity.upn,
      holdReason: holdReason || undefined,
    });
  } catch (error) {
    if (error instanceof TransitionError) return { error: error.message };
    throw error;
  }

  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/queue");
  revalidatePath("/leader");
  return {};
}
