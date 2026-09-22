"use client";

import { useActionState } from "react";

import { resumeAction, type ConsoleState } from "@/app/(app)/my-work/actions";

/** Put a paused or pending ticket back in hand and restart its clock. */
export function ResumeButton({ ticketId }: { ticketId: string }) {
  const [state, formAction, pending] = useActionState<ConsoleState, FormData>(
    resumeAction,
    {}
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="ticketId" value={ticketId} />
      <button className="btn" disabled={pending}>
        {pending ? "…" : "Resume"}
      </button>
      {state.error && (
        <div style={{ color: "var(--red)", fontSize: 11, marginTop: 4 }}>
          {state.error}
        </div>
      )}
    </form>
  );
}
