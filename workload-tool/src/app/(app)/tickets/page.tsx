import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { listQueue, queueCounts } from "@/lib/db/tickets";
import { TICKET_STATUSES, type TicketStatus } from "@/lib/domain/constants";
import { Empty, PageHead, Panel, SlaCell, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TicketsPage(props: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole("MEMBER");
  const params = await props.searchParams;
  const now = new Date();

  const active = params.status && TICKET_STATUSES.includes(params.status as TicketStatus)
    ? (params.status as TicketStatus)
    : null;

  const [tickets, counts] = await Promise.all([
    listQueue({ statuses: active ? [active] : [...TICKET_STATUSES], take: 300 }),
    queueCounts(),
  ]);

  return (
    <>
      <PageHead
        title="All Tickets"
        description="Every ticket, from mail ingestion or manual entry, ordered by SLA due time."
      />

      <Panel>
        <div className="tabs">
          <Link href="/tickets" className={`tab ${!active ? "active" : ""}`}>
            All
          </Link>
          {TICKET_STATUSES.map((s) => (
            <Link
              key={s}
              href={`/tickets?status=${s}`}
              className={`tab ${active === s ? "active" : ""}`}
            >
              {s.replace("_", " ")} ({counts[s] ?? 0})
            </Link>
          ))}
        </div>

        {tickets.length === 0 ? (
          <Empty>Nothing in this view.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Type</th>
                <th>Source</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Received</th>
                <th>SLA left</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link href={`/tickets/${t.id}`}>
                      <b>{t.subject}</b>
                    </Link>
                  </td>
                  <td style={{ color: "var(--muted)" }}>{t.ticketType}</td>
                  <td style={{ color: "var(--muted)" }}>{t.source}</td>
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td style={{ color: "var(--muted)" }}>
                    {t.currentAssignee?.displayName ?? "—"}
                  </td>
                  <td className="tnum" style={{ color: "var(--muted)" }}>
                    {t.receivedAt.toLocaleString()}
                  </td>
                  <td>
                    <SlaCell dueAt={t.dueAt} status={t.status} now={now} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
  );
}
