"use client";

import { useActionState } from "react";

import {
  overrideAssignmentAction,
  type OverrideState,
} from "@/app/leader/actions";

export interface AgentOption {
  id: string;
  displayName: string;
  available: boolean;
  openTicketCount: number;
  concurrentCap: number;
  reason: string;
}

export function OverrideForm({
  ticketId,
  currentAssigneeId,
  agents,
}: {
  ticketId: string;
  currentAssigneeId: string | null;
  agents: AgentOption[];
}) {
  const [state, formAction, pending] = useActionState<OverrideState, FormData>(
    overrideAssignmentAction,
    {}
  );

  return (
    <form action={formAction} className="flex flex-wrap items-center gap-1.5">
      <input type="hidden" name="ticketId" value={ticketId} />
      <select
        name="agentId"
        defaultValue={currentAssigneeId ?? ""}
        className="rounded border border-[var(--color-line)] bg-white px-2 py-1 text-xs"
      >
        <option value="">Assign to…</option>
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.displayName} ({agent.openTicketCount}/{agent.concurrentCap})
            {agent.available ? "" : ` — ${agent.reason}`}
          </option>
        ))}
      </select>
      <input
        name="note"
        placeholder="Reason (optional)"
        className="w-36 rounded border border-[var(--color-line)] px-2 py-1 text-xs"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "…" : "Apply"}
      </button>
      {state.error && (
        <span className="text-[11px] text-red-600">{state.error}</span>
      )}
      {state.ok && (
        <span className="text-[11px] text-emerald-700">{state.ok}</span>
      )}
    </form>
  );
}
