import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth";
import { getTicket } from "@/lib/db/tickets";
import { handleSecondsFor } from "@/lib/db/metrics";
import { formatDuration } from "@/lib/domain/work";
import { Empty, PageHead, Panel, SlaCell, StatusBadge } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TicketPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireRole("MEMBER");
  const { id } = await props.params;
  const now = new Date();

  const ticket = await getTicket(id);
  if (!ticket) notFound();

  const handled = await handleSecondsFor(ticket.id, now);
  const onTime =
    ticket.resolvedAt !== null &&
    ticket.resolvedAt.getTime() <= ticket.dueAt.getTime();

  return (
    <>
      <PageHead title={ticket.subject} description={`${ticket.ticketType} · ${ticket.source}`} />

      <div className="two">
        <div>
          <Panel title="Details">
            <div className="kv">
              <div className="k">Status</div>
              <div className="v">
                <StatusBadge status={ticket.status} />
              </div>
              <div className="k">Complexity</div>
              <div className="v">
                <span className="badge normal">{ticket.complexity}</span>
                <span style={{ color: "var(--muted)", fontSize: 11, marginLeft: 8 }}>
                  reporting only — not used for allocation
                </span>
              </div>
              <div className="k">Assignee</div>
              <div className="v">{ticket.currentAssignee?.displayName ?? "Unassigned"}</div>
              <div className="k">Received</div>
              <div className="v tnum">{ticket.receivedAt.toLocaleString()}</div>
              <div className="k">SLA due</div>
              <div className="v tnum">{ticket.dueAt.toLocaleString()}</div>
              <div className="k">SLA remaining</div>
              <div className="v">
                <SlaCell dueAt={ticket.dueAt} status={ticket.status} now={now} />
              </div>
              <div className="k">Worked time</div>
              <div className="v tnum">{formatDuration(handled)}</div>
              <div className="k">Time pending</div>
              <div className="v tnum">
                {ticket.holdAccumulatedMinutes} min
                {ticket.onHoldSince ? " (pending now)" : ""}
              </div>
              <div className="k">Pending reason</div>
              <div className="v">{ticket.holdReason ?? "—"}</div>
              {ticket.resolvedAt && (
                <>
                  <div className="k">Resolved</div>
                  <div className="v tnum">
                    {ticket.resolvedAt.toLocaleString()}{" "}
                    <span className={`badge ${onTime ? "ok" : "bad"}`}>
                      {onTime ? "ON TIME" : "BREACHED"}
                    </span>
                  </div>
                </>
              )}
            </div>
            {ticket.body && (
              <div className="notice" style={{ marginTop: 16, background: "#fafbfc", color: "inherit" }}>
                {ticket.body}
              </div>
            )}
          </Panel>

          <Panel title="Assignment history" style={{ marginTop: 17 }}>
            {ticket.assignments.length === 0 ? (
              <Empty>Never assigned.</Empty>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Reason</th>
                    <th>From</th>
                    <th>To</th>
                  </tr>
                </thead>
                <tbody>
                  {ticket.assignments.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <b>{a.agent.displayName}</b>
                      </td>
                      <td style={{ color: "var(--muted)" }}>{a.reason}</td>
                      <td className="tnum">{a.assignedAt.toLocaleString()}</td>
                      <td className="tnum">
                        {a.unassignedAt ? a.unassignedAt.toLocaleString() : "current"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>

        <Panel title="Audit trail">
          <div className="timeline">
            {ticket.events.map((e) => (
              <div className="event" key={e.id}>
                <b>{e.event}</b>
                <small>
                  {e.at.toLocaleString()} · {e.actor}
                </small>
                {e.detailsJson && (
                  <pre
                    style={{
                      background: "#f7f8fb",
                      borderRadius: 7,
                      padding: 9,
                      fontSize: 11,
                      overflowX: "auto",
                      marginTop: 6,
                    }}
                  >
                    {pretty(e.detailsJson)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

function pretty(json: string): string {
  try {
    return JSON.stringify(JSON.parse(json), null, 2);
  } catch {
    return json;
  }
}
