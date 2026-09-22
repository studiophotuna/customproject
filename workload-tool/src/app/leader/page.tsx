import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { resolveCandidates } from "@/lib/db/agents";
import { listQueue } from "@/lib/db/tickets";
import { isAvailable } from "@/lib/allocation/allocation-engine";
import { configFromEnv } from "@/lib/allocation/run";
import { Card, Empty, SlaCell, StatusBadge } from "@/components/ui";
import { OverrideForm, type AgentOption } from "@/app/leader/OverrideForm";

export const dynamic = "force-dynamic";

/** Why an agent is not available, for the leader's benefit. */
function unavailableReason(agent: {
  onShiftNow: boolean;
  onLeaveOrWfhBlocked: boolean;
  openTicketCount: number;
  concurrentCap: number;
}): string {
  if (!agent.onShiftNow) return "off shift";
  if (agent.onLeaveOrWfhBlocked) return "on leave/WFH";
  if (agent.openTicketCount >= agent.concurrentCap) return "at cap";
  return "available";
}

export default async function LeaderPage() {
  await requireRole("LEADER");

  const now = new Date();
  const [candidates, tickets] = await Promise.all([
    resolveCandidates(now),
    listQueue({ statuses: ["NEW", "ASSIGNED", "IN_PROGRESS", "ON_HOLD"] }),
  ]);
  const config = configFromEnv();

  const agentOptions: AgentOption[] = candidates.map((agent) => ({
    id: agent.id,
    displayName: agent.displayName,
    available: isAvailable(agent),
    openTicketCount: agent.openTicketCount,
    concurrentCap: agent.concurrentCap,
    reason: unavailableReason(agent),
  }));

  const unassigned = tickets.filter((t) => t.currentAssigneeId === null);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">Allocation board</h1>
        <p className="text-xs text-[var(--color-ink-muted)]">
          Live queue with manual override. Auto-allocation runs in the worker
          process ({config.ordering} / {config.policy}) — start it with{" "}
          <code className="rounded bg-[var(--color-surface-muted)] px-1">
            npm run worker
          </code>
          .
        </p>
      </div>

      <Card
        title="Agent availability"
        actions={
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            as of {now.toLocaleTimeString()}
          </span>
        }
      >
        {candidates.length === 0 ? (
          <Empty>No allocatable agents. Seed the database first.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-line)] text-[11px] uppercase tracking-wide text-[var(--color-ink-muted)]">
              <tr>
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">On shift</th>
                <th className="px-4 py-2 font-medium">Leave / WFH</th>
                <th className="px-4 py-2 font-medium">Load</th>
                <th className="px-4 py-2 font-medium">Allocatable</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((agent) => {
                const available = isAvailable(agent);
                return (
                  <tr
                    key={agent.id}
                    className="border-b border-[var(--color-line)] last:border-0"
                  >
                    <td className="px-4 py-2">
                      <span className="font-medium">{agent.displayName}</span>
                      <span className="ml-2 text-[11px] text-[var(--color-ink-muted)]">
                        {agent.adUpn}
                      </span>
                    </td>
                    <td className="px-4 py-2">{agent.onShiftNow ? "yes" : "no"}</td>
                    <td className="px-4 py-2">
                      {agent.onLeaveOrWfhBlocked ? "blocked" : "—"}
                    </td>
                    <td className="px-4 py-2 tnum">
                      {agent.openTicketCount} / {agent.concurrentCap}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={
                          available
                            ? "text-emerald-700"
                            : "text-[var(--color-ink-muted)]"
                        }
                      >
                        {unavailableReason(agent)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>

      <Card
        title="Queue"
        actions={
          <span className="text-[11px] text-[var(--color-ink-muted)]">
            {unassigned.length} awaiting allocation
          </span>
        }
      >
        {tickets.length === 0 ? (
          <Empty>Queue is empty.</Empty>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--color-line)] text-[11px] uppercase tracking-wide text-[var(--color-ink-muted)]">
              <tr>
                <th className="px-4 py-2 font-medium">Subject</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Assignee</th>
                <th className="px-4 py-2 font-medium">SLA left</th>
                <th className="px-4 py-2 font-medium">Override</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((ticket) => (
                <tr
                  key={ticket.id}
                  className="border-b border-[var(--color-line)] last:border-0 align-middle"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/tickets/${ticket.id}`}
                      className="font-medium hover:underline"
                    >
                      {ticket.subject}
                    </Link>
                    <span className="ml-2 text-[11px] text-[var(--color-ink-muted)]">
                      {ticket.ticketType}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge status={ticket.status} />
                  </td>
                  <td className="px-4 py-2 text-[var(--color-ink-muted)]">
                    {ticket.currentAssignee?.displayName ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <SlaCell dueAt={ticket.dueAt} status={ticket.status} now={now} />
                  </td>
                  <td className="px-4 py-2">
                    <OverrideForm
                      ticketId={ticket.id}
                      currentAssigneeId={ticket.currentAssigneeId}
                      agents={agentOptions}
                    />
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
