"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import {
  WorkError,
  getNextTicket,
  pendCurrentTicket,
  resolveCurrentTicket,
  resumeTicket,
  setActivity,
  startWork,
  stopWork,
} from "@/lib/db/work";

export interface ConsoleState {
  error?: string;
  message?: string;
}

/** Every console action needs an Agent row — a role alone cannot hold tickets. */
async function actingAgent() {
  const identity = await requireRole("MEMBER");
  if (!identity.agentId) {
    throw new WorkError(
      `${identity.upn} has no active agent record, so no work can be assigned.`
    );
  }
  return identity;
}

function refresh(): void {
  revalidatePath("/my-work");
  revalidatePath("/");
  revalidatePath("/tickets");
  revalidatePath("/team");
}

/** Wrap a console operation so a WorkError becomes a message, not a crash. */
async function run(fn: () => Promise<string | undefined>): Promise<ConsoleState> {
  try {
    const message = await fn();
    refresh();
    return message ? { message } : {};
  } catch (error) {
    if (error instanceof WorkError) return { error: error.message };
    throw error;
  }
}

export async function startWorkAction(): Promise<ConsoleState> {
  return run(async () => {
    const identity = await actingAgent();
    const result = await startWork(identity.agentId!, identity.upn);
    return result.ticketId
      ? "Clocked in. First ticket assigned and the clock is running."
      : "Clocked in. Nothing is waiting in the queue right now.";
  });
}

export async function stopWorkAction(): Promise<ConsoleState> {
  return run(async () => {
    const identity = await actingAgent();
    await stopWork(identity.agentId!);
    return "Clocked out.";
  });
}

export async function nextTicketAction(): Promise<ConsoleState> {
  return run(async () => {
    const identity = await actingAgent();
    const id = await getNextTicket(identity.agentId!, identity.upn);
    return id ? "Next ticket assigned." : "The queue is empty.";
  });
}

export async function resolveAction(): Promise<ConsoleState> {
  return run(async () => {
    const identity = await actingAgent();
    const { nextId } = await resolveCurrentTicket(identity.agentId!, identity.upn);
    return nextId
      ? "Resolved. The next ticket is already running."
      : "Resolved. Nothing else is waiting.";
  });
}

export async function pendAction(
  _previous: ConsoleState,
  formData: FormData
): Promise<ConsoleState> {
  return run(async () => {
    const identity = await actingAgent();
    const reason = String(formData.get("reason") ?? "");
    const { nextId } = await pendCurrentTicket(identity.agentId!, identity.upn, reason);
    return nextId
      ? "Marked pending. The next ticket is already running."
      : "Marked pending. Nothing else is waiting.";
  });
}

export async function activityAction(
  _previous: ConsoleState,
  formData: FormData
): Promise<ConsoleState> {
  return run(async () => {
    const identity = await actingAgent();
    const kind = String(formData.get("kind") ?? "");
    const note = String(formData.get("note") ?? "").trim() || undefined;
    await setActivity(identity.agentId!, kind, identity.upn, note);
    return `Status set to ${kind.toLowerCase()}.`;
  });
}

export async function resumeAction(
  _previous: ConsoleState,
  formData: FormData
): Promise<ConsoleState> {
  return run(async () => {
    const identity = await actingAgent();
    const ticketId = String(formData.get("ticketId") ?? "");
    await resumeTicket(identity.agentId!, ticketId, identity.upn);
    return "Back on the ticket; its clock is running again.";
  });
}
