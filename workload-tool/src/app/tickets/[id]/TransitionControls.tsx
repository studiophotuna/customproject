"use client";

import { useActionState, useState } from "react";

import {
  transitionAction,
  type TransitionState,
} from "@/app/tickets/[id]/actions";
import { ErrorNote } from "@/components/ui";

export function TransitionControls({
  ticketId,
  options,
}: {
  ticketId: string;
  options: string[];
}) {
  const [state, formAction, pending] = useActionState<TransitionState, FormData>(
    transitionAction,
    {}
  );
  const [target, setTarget] = useState<string | null>(null);

  if (options.length === 0) {
    return (
      <p className="px-4 py-3 text-xs text-[var(--color-ink-muted)]">
        This ticket is closed. No further transitions are possible.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3 p-4">
      {state.error && <ErrorNote>{state.error}</ErrorNote>}
      <input type="hidden" name="ticketId" value={ticketId} />

      {/* ON_HOLD is the one transition that needs a reason, so the field
          appears only once the user has picked it. */}
      {target === "ON_HOLD" && (
        <div>
          <label
            className="block text-xs font-medium text-[var(--color-ink-muted)]"
            htmlFor="holdReason"
          >
            Hold reason (required — stops the SLA clock)
          </label>
          <input
            id="holdReason"
            name="holdReason"
            required
            maxLength={400}
            className="mt-1 w-full rounded border border-[var(--color-line)] px-2.5 py-1.5 text-sm"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="submit"
            name="to"
            value={option}
            disabled={pending}
            onClick={() => setTarget(option)}
            className="rounded border border-[var(--color-line)] bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-[var(--color-surface-muted)] disabled:opacity-50"
          >
            {option === "NEW" ? "Unassign (back to queue)" : option.replace("_", " ")}
          </button>
        ))}
      </div>
      {target === "ON_HOLD" && (
        <p className="text-[11px] text-[var(--color-ink-muted)]">
          Fill the reason above, then press ON HOLD again.
        </p>
      )}
    </form>
  );
}
