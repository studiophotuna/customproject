import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { resolveCandidates } from "@/lib/db/agents";
import { listQueue } from "@/lib/db/tickets";
import { isAvailable } from "@/lib/allocation/allocation-engine";
import { configFromEnv } from "@/lib/allocation/run";
import { Empty, PageHead, Panel, SlaCell, StatusBadge } from "@/components/ui";
import { OverrideForm, type AgentOption } from "@/app/(app)/allocation/OverrideForm";

export const dynamic = "force-dynamic";

function reasonFor(a: {
  onShiftNow: boolean;
  onLeaveOrWfhBlocked: boolean;
  openTicketCount: number;
  concurrentCap: number;
}): string {
  if (!a.onShiftNow) return "off shift";
  if (a.onLeaveOrWfhBlocked) return "on leave/WFH";
  if (a.openTicketCount >= a.concurrentCap) return "at cap";
  return "available";
}

export default async function AllocationPage() {
  await requireRole("LEADER");
  const now = new Date();

  const [candidates, tickets] = await Promise.all([
    resolveCandidates(now),
    listQueue({ statuses: ["NEW", "ASSIGNED", "IN_PROGRESS", "ON_HOLD"], take: 200 }),
  ]);
  const config = configFromEnv();

  const options: AgentOption[] = candidates.map((a) => ({
    id: a.id,
    displayName: a.displayName,
    openTicketCount: a.openTicketCount,
    concurrentCap: a.concurrentCap,
    reason: reasonFor(a),
    available: isAvailable(a),
  }));

  const waiting = tickets.filter((t) => t.currentAssigneeId === null);

  return (
    <>
      <PageHead
        title="Allocation Monitor"
        description={`Ordering ${config.ordering} · policy ${config.policy}. Tickets are assigned only when a member starts working — nothing is pushed to someone who is logged off.`}
      />

      <div className="two">
        <Panel
          title="Agent eligibility"
          action={<span className="badge new">as of {now.toLocaleTimeString()}</span>}
        >
          {candidates.length === 0 ? (
            <Empty>No allocatable agents.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Agent</th>
                  <th>On shift</th>
                  <th>Leave / WFH</th>
                  <th>Load</th>
                  <th>Eligible</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((a) => {
                  const ok = isAvailable(a);
                  return (
                    <tr key={a.id}>
                      <td>
                        <b>{a.displayName}</b>
                        <div style={{ color: "var(--muted)", fontSize: 11 }}>{a.adUpn}</div>
                      </td>
                      <td>{a.onShiftNow ? "yes" : "no"}</td>
                      <td>{a.onLeaveOrWfhBlocked ? "blocked" : "—"}</td>
                      <td className="tnum">
                        {a.openTicketCount} / {a.concurrentCap}
                      </td>
                      <td>
                        <span className={`badge ${ok ? "ok" : "new"}`}>{reasonFor(a)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Waiting for allocation" action={<span className="badge new">{waiting.length}</span>}>
          {waiting.length === 0 ? (
            <Empty>Nothing waiting — everything is with someone.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Received</th>
                  <th>SLA left</th>
                </tr>
              </thead>
              <tbody>
                {waiting.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/tickets/${t.id}`}>
                        <b>{t.subject}</b>
                      </Link>
                      <div style={{ color: "var(--muted)", fontSize: 11 }}>{t.ticketType}</div>
                    </td>
                    <td className="tnum" style={{ color: "var(--muted)" }}>
                      {t.receivedAt.toLocaleTimeString()}
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
      </div>

      <Panel title="Queue with manual override" style={{ marginTop: 17 }}>
        {tickets.length === 0 ? (
          <Empty>Queue is empty.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Subject</th>
                <th>Status</th>
                <th>Owner</th>
                <th>SLA left</th>
                <th>Override</th>
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
                  <td>
                    <StatusBadge status={t.status} />
                  </td>
                  <td style={{ color: "var(--muted)" }}>
                    {t.currentAssignee?.displayName ?? "—"}
                  </td>
                  <td>
                    <SlaCell dueAt={t.dueAt} status={t.status} now={now} />
                  </td>
                  <td>
                    <OverrideForm
                      ticketId={t.id}
                      currentAssigneeId={t.currentAssigneeId}
                      agents={options}
                    />
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
