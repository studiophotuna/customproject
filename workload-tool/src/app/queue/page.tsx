import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { listQueue, queueCounts } from "@/lib/db/tickets";
import { hasAtLeast, type TicketStatus } from "@/lib/domain/constants";
import { Card, Empty, SlaCell, StatusBadge, ButtonLink } from "@/components/ui";

// DB-backed and per-user: never prerendered, never cached.
export const dynamic = "force-dynamic";

const SCOPES = ["mine", "unassigned", "all"] as const;
type Scope = (typeof SCOPES)[number];

export default async function QueuePage(props: {
  searchParams: Promise<{ scope?: string; status?: string }>;
}) {
  const identity = await requireRole("MEMBER");
  const params = await props.searchParams;
  const now = new Date();

  // Members default to their own work; leaders and up default to the whole queue.
  const requested = params.scope as Scope | undefined;
  const isLeader = hasAtLeast(identity.role, "LEADER");
  const scope: Scope =
    requested && SCOPES.includes(requested)
      ? requested
      : isLeader
        ? "all"
        : "mine";

  // A member may only ever read their own queue, whatever the query string says.
  const effectiveScope: Scope = isLeader ? scope : "mine";

  const statuses = params.status
    ? (params.status.split(",") as TicketStatus[])
    : undefined;

  const [tickets, counts] = await Promise.all([
    listQueue({
      statuses,
      assigneeId:
        effectiveScope === "mine" ? identity.agentId ?? "__none__" : undefined,
      unassignedOnly: effectiveScope === "unassigned",
    }),
    queueCounts(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Queue</h1>
          <p className="text-xs text-[var(--color-ink-muted)]">
            Ordered by SLA due time, arrival breaking ties — the same order the
            allocator works.
          </p>
        </div>
        <ButtonLink href="/tickets/new">New ticket</ButtonLink>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isLeader &&
          SCOPES.map((option) => (
            <Link
              key={option}
              href={`/queue?scope=${option}`}
              className={`rounded border px-2.5 py-1 text-xs capitalize ${
                effectiveScope === option
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-[var(--color-line)] bg-white text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)]"
              }`}
            >
              {option}
            </Link>
          ))}
        <span className="ml-auto text-xs text-[var(--color-ink-muted)]">
          {Object.entries(counts)
            .map(([status, n]) => `${status.replace("_", " ")} ${n}`)
            .join(" · ")}
        </span>
      </div>

      {identity.agentId === null && effectiveScope === "mine" && (
        <p className="rounded border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {identity.upn} has no active Agent record, so no tickets can be
          allocated to you. An admin needs to create one.
        </p>
      )}

      <Card title={`${tickets.length} ticket${tickets.length === 1 ? "" : "s"}`}>
        {tickets.length === 0 ? (
          <Empty>Nothing in this view.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-line)] text-[11px] uppercase tracking-wide text-[var(--color-ink-muted)]">
              <tr>
                <th className="px-4 py-2 font-medium">Subject</th>
                <th className="px-4 py-2 font-medium">Type</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Assignee</th>
                <th className="px-4 py-2 font-medium">Received</th>
                <th className="px-4 py-2 font-medium">SLA left</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="border-b border-[var(--color-line)] last:border-0 hover:bg-[var(--color-surface-muted)]"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {ticket.subject}
                    </Link>
                    <span className="ml-2 text-[11px] text-[var(--color-ink-muted)]">
                      {ticket.source}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-[var(--color-ink-muted)]">
                    {ticket.ticketType}
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-2 text-[var(--color-ink-muted)]">
                    {ticket.currentAssignee?.displayName ?? "—"}
                  </td>
                  <td className="px-4 py-2 tnum text-[var(--color-ink-muted)]">
                    {ticket.receivedAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <SlaCell dueAt={ticket.dueAt} status={ticket.status} now={now} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
