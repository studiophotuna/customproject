import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { Empty, PageHead, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function AuditPage() {
  await requireRole("LEADER");

  const events = await prisma.auditLog.findMany({
    orderBy: { at: "desc" },
    take: 200,
    select: {
      id: true,
      at: true,
      event: true,
      actor: true,
      detailsJson: true,
      ticket: { select: { id: true, subject: true } },
    },
  });

  return (
    <>
      <PageHead
        title="Audit Log"
        description="Every lifecycle transition and allocation decision, written in the same transaction as the change it records."
      />
      <Panel>
        {events.length === 0 ? (
          <Empty>Nothing recorded yet.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Event</th>
                <th>Ticket</th>
                <th>Actor</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td className="tnum" style={{ whiteSpace: "nowrap" }}>
                    {e.at.toLocaleString()}
                  </td>
                  <td>
                    <span className="badge normal">{e.event}</span>
                  </td>
                  <td>
                    {e.ticket ? (
                      <Link href={`/tickets/${e.ticket.id}`}>{e.ticket.subject}</Link>
                    ) : (
                      <span style={{ color: "var(--muted)" }}>—</span>
                    )}
                  </td>
                  <td style={{ color: "var(--muted)" }}>{e.actor}</td>
                  <td style={{ color: "var(--muted)", fontSize: 11, maxWidth: 420 }}>
                    {e.detailsJson ?? "—"}
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
