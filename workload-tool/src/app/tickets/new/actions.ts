"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { createTicket, TicketCreationError } from "@/lib/db/tickets";

export interface CreateTicketState {
  error?: string;
}

/**
 * Manual ticket creation.
 *
 * Server Actions are reachable by direct POST, so authorisation is checked
 * here rather than relying on the page having rendered the form.
 */
export async function createTicketAction(
  _previous: CreateTicketState,
  formData: FormData
): Promise<CreateTicketState> {
  const identity = await requireRole("MEMBER");

  const subject = String(formData.get("subject") ?? "");
  const ticketType = String(formData.get("ticketType") ?? "");
  const body = String(formData.get("body") ?? "");
  const receivedAtRaw = String(formData.get("receivedAt") ?? "");

  // A blank receivedAt means "now"; a supplied one lets a user log a request
  // that arrived earlier, which starts the SLA clock at the real arrival time.
  const receivedAt = receivedAtRaw ? new Date(receivedAtRaw) : new Date();
  if (Number.isNaN(receivedAt.getTime())) {
    return { error: "Received-at is not a valid date/time." };
  }
  if (receivedAt.getTime() > Date.now() + 60_000) {
    return { error: "Received-at cannot be in the future." };
  }

  let ticketId: string;
  try {
    const ticket = await createTicket({
      source: "MANUAL",
      subject,
      body,
      ticketType,
      receivedAt,
      actor: identity.upn,
    });
    ticketId = ticket.id;
  } catch (error) {
    if (error instanceof TicketCreationError) return { error: error.message };
    throw error;
  }

  revalidatePath("/queue");
  revalidatePath("/leader");
  redirect(`/tickets/${ticketId}`);
}
