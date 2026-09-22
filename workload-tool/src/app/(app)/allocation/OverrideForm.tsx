"use client";

import { useActionState } from "react";

import { overrideAssignmentAction, type OverrideState } from "@/app/(app)/allocation/actions";

export interface AgentOption {
  id: string;
  displayName: string;
  openTicketCount: number;
  concurrentCap: number;
  reason: string;
  available: boolean;
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
    <form action={formAction} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <select
        name="agentId"
        defaultValue={currentAssigneeId ?? ""}
        style={{
          border: "1px solid var(--line)",
          borderRadius: 7,
          padding: "6px 8px",
          fontSize: 12,
          background: "#fff",
        }}
      >
        <option value="">Assign to…</option>
        {agents.map((a) => (
          <option key={a.id} value={a.id}>
            {a.displayName} ({a.openTicketCount}/{a.concurrentCap})
            {a.available ? "" : ` — ${a.reason}`}
          </option>
        ))}
      </select>
      <input
        name="note"
        placeholder="Reason"
        style={{
          border: "1px solid var(--line)",
          borderRadius: 7,
          padding: "6px 8px",
          fontSize: 12,
          width: 130,
        }}
      />
      <button className="btn" disabled={pending} style={{ padding: "6px 11px", fontSize: 12 }}>
        {pending ? "…" : "Apply"}
      </button>
      {state.error && <span style={{ color: "var(--red)", fontSize: 11 }}>{state.error}</span>}
      {state.ok && <span style={{ color: "var(--green)", fontSize: 11 }}>{state.ok}</span>}
    </form>
  );
}
