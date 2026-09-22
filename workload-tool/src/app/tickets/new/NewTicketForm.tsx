"use client";

import { useActionState } from "react";

import {
  createTicketAction,
  type CreateTicketState,
} from "@/app/tickets/new/actions";
import { ErrorNote } from "@/components/ui";

interface RuleOption {
  ticketType: string;
  slaMinutes: number;
  businessHoursOnly: boolean;
}

const LABEL = "block text-xs font-medium text-[var(--color-ink-muted)]";
const INPUT =
  "mt-1 w-full rounded border border-[var(--color-line)] px-2.5 py-1.5 text-sm outline-none focus:border-slate-500";

export function NewTicketForm({ rules }: { rules: RuleOption[] }) {
  const [state, formAction, pending] = useActionState<
    CreateTicketState,
    FormData
  >(createTicketAction, {});

  return (
    <form action={formAction} className="space-y-4 p-4">
      {state.error && <ErrorNote>{state.error}</ErrorNote>}

      <div>
        <label className={LABEL} htmlFor="subject">
          Subject
        </label>
        <input id="subject" name="subject" required maxLength={400} className={INPUT} />
      </div>

      <div>
        <label className={LABEL} htmlFor="ticketType">
          Ticket type
        </label>
        <select id="ticketType" name="ticketType" required className={INPUT}>
          {rules.map((rule) => (
            <option key={rule.ticketType} value={rule.ticketType}>
              {rule.ticketType} — {formatSla(rule.slaMinutes)}{" "}
              {rule.businessHoursOnly ? "business hours" : "calendar hours"}
            </option>
          ))}
        </select>
        <p className="mt-1 text-[11px] text-[var(--color-ink-muted)]">
          Sets the SLA. The due time is snapshotted onto the ticket now, so
          later edits to the SLA matrix will not move it.
        </p>
      </div>

      <div>
        <label className={LABEL} htmlFor="receivedAt">
          Received at
        </label>
        <input
          id="receivedAt"
          name="receivedAt"
          type="datetime-local"
          className={INPUT}
        />
        <p className="mt-1 text-[11px] text-[var(--color-ink-muted)]">
          Leave blank for now. Starts the SLA clock.
        </p>
      </div>

      <div>
        <label className={LABEL} htmlFor="body">
          Details
        </label>
        <textarea id="body" name="body" rows={6} className={INPUT} />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create ticket"}
      </button>
    </form>
  );
}

function formatSla(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = minutes / 60;
  return Number.isInteger(hours) ? `${hours}h` : `${minutes}m`;
}
