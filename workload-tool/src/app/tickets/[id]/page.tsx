import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { getTicket } from "@/lib/db/tickets";
import { nextStatuses } from "@/lib/tickets/lifecycle";
import type { TicketStatus } from "@/lib/domain/constants";
import { Card, SlaCell, StatusBadge } from "@/components/ui";
import { TransitionControls } from "@/app/tickets/[id]/TransitionControls";

export const dynamic = "force-dynamic";

export default async function TicketPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("MEMBER");
  const { id } = await props.params;
  const now = new Date();

  const ticket = await getTicket(id);
  if (!ticket) notFound();

  const options = nextStatuses(ticket.status as TicketStatus);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div>
          <div className="flex items-center gap-2">
            <StatusBadge status={ticket.status} />
            <span className="text-xs text-[var(--color-ink-muted)]">
              {ticket.ticketType} · {ticket.source}
            </span>
          </div>
          <h1 className="mt-1 text-lg font-semibold">{ticket.subject}</h1>
        </div>

        <Card title="Details">
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 text-sm">
            <Field label="Assignee">
              {ticket.currentAssignee?.displayName ?? "Unassigned"}
            </Field>
            <Field label="SLA remaining">
              <SlaCell dueAt={ticket.dueAt} status={ticket.status} now={now} />
            </Field>
            <Field label="Received">{ticket.receivedAt.toLocaleString()}</Field>
            <Field label="Due">{ticket.dueAt.toLocaleString()}</Field>
            <Field label="Time on hold">
              {ticket.holdAccumulatedMinutes} min
              {ticket.onHoldSince ? " (on hold now)" : ""}
            </Field>
            <Field label="Hold reason">{ticket.holdReason ?? "—"}</Field>
            {ticket.resolvedAt && (
              <Field label="Resolved">{ticket.resolvedAt.toLocaleString()}</Field>
            )}
            {ticket.closedAt && (
              <Field label="Closed">{ticket.closedAt.toLocaleString()}</Field>
            )}
          </dl>
          {ticket.body && (
            <div className="border-t border-[var(--color-line)] px-4 py-3">
              <p className="whitespace-pre-wrap text-sm">{ticket.body}</p>
            </div>
          )}
        </Card>

        <Card title="Move this ticket">
          <TransitionControls ticketId={ticket.id} options={options} />
        </Card>
      </div>

      <div className="space-y-4">
        <Card title="Assignment history">
          <ul className="divide-y divide-[var(--color-line)] text-xs">
            {ticket.assignments.length === 0 && (
              <li className="px-4 py-3 text-[var(--color-ink-muted)]">
                Never assigned.
              </li>
            )}
            {ticket.assignments.map((assignment) => (
              <li key={assignment.id} className="px-4 py-2.5">
                <div className="font-medium">{assignment.agent.displayName}</div>
                <div className="tnum text-[var(--color-ink-muted)]">
                  {assignment.reason} · {assignment.assignedAt.toLocaleString()}
                  {assignment.unassignedAt
                    ? ` → ${assignment.unassignedAt.toLocaleString()}`
                    : " → current"}
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Audit trail">
          <ul className="divide-y divide-[var(--color-line)] text-xs">
            {ticket.events.map((event) => (
              <li key={event.id} className="px-4 py-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{event.event}</span>
                  <span className="tnum text-[var(--color-ink-muted)]">
                    {event.at.toLocaleString()}
                  </span>
                </div>
                <div className="text-[var(--color-ink-muted)]">{event.actor}</div>
                {event.detailsJson && (
                  <pre className="mt-1 overflow-x-auto rounded bg-[var(--color-surface-muted)] p-2 text-[10px] leading-relaxed">
                    {formatDetails(event.detailsJson)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-[var(--color-ink-muted)]">
        {label}
      </dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function formatDetails(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}
