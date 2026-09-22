import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { listQueue } from "@/lib/db/tickets";
import { dashboardStats, startOfDay, utilizationFor } from "@/lib/db/metrics";
import { prisma } from "@/lib/db/prisma";
import { configFromEnv } from "@/lib/allocation/run";
import { formatDuration } from "@/lib/domain/work";
import {
  Empty,
  Initials,
  Metric,
  PageHead,
  Panel,
  SlaCell,
  StatusBadge,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireRole("MEMBER");
  const now = new Date();

  const [stats, tickets, util, recent] = await Promise.all([
    dashboardStats(now),
    listQueue({ statuses: ["NEW", "ASSIGNED", "IN_PROGRESS", "ON_HOLD"], take: 8 }),
    utilizationFor(startOfDay(now), now),
    prisma.auditLog.findMany({
      orderBy: { at: "desc" },
      take: 6,
      select: {
        id: true,
        event: true,
        actor: true,
        at: true,
        ticket: { select: { id: true, subject: true } },
      },
    }),
  ]);

  const config = configFromEnv();

  return (
    <>
      <PageHead
        title="Queue Dashboard"
        description="Tickets arrive from the team's mailbox. They are assigned automatically — but only when a member starts working, never pushed to someone who is logged off."
        actions={
          <Link className="btn primary" href="/my-work">
            Go to my work
          </Link>
        }
      />

      <section className="cards">
        <Metric
          label="Open tickets"
          value={stats.openTickets}
          sub={`${stats.awaitingAllocation} awaiting allocation`}
          tone="muted"
        />
        <Metric
          label="SLA breached"
          value={stats.breached}
          sub={`${stats.slaAtRisk} due within the hour`}
          tone={stats.breached > 0 ? "bad" : "good"}
        />
        <Metric
          label="Timeliness today"
          value={`${stats.timeliness.pct}%`}
          sub={`${stats.timeliness.onTime} on time of ${stats.timeliness.resolved} resolved`}
          bar={stats.timeliness.pct}
        />
        <Metric
          label="Team utilization"
          value={`${stats.teamUtilization}%`}
          sub={`${stats.clockedIn} of ${stats.headcount} clocked in`}
          bar={stats.teamUtilization}
        />
      </section>

      <div className="two">
        <Panel
          title="Priority queue"
          action={
            <Link className="btn" href="/tickets">
              View all
            </Link>
          }
        >
          {tickets.length === 0 ? (
            <Empty>Queue is empty.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Owner</th>
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
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td style={{ color: "var(--muted)" }}>
                      {t.currentAssignee?.displayName ?? "—"}
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

        <Panel
          title="Who is working"
          action={
            <Link className="btn" href="/team">
              Team
            </Link>
          }
        >
          {util.length === 0 ? (
            <Empty>No agents seeded.</Empty>
          ) : (
            util.map((u) => (
              <div className="agent" key={u.agentId}>
                <Initials name={u.displayName} />
                <div className="agentmeta">
                  <b>{u.displayName}</b>
                  <small>
                    {u.clockedIn
                      ? `${u.currentKind?.toLowerCase() ?? "clocked in"} · ${formatDuration(u.productiveSeconds)} productive`
                      : "not clocked in"}
                  </small>
                </div>
                <div className="count">{u.clockedIn ? `${u.utilization}%` : "—"}</div>
              </div>
            ))
          )}
        </Panel>
      </div>

      <div className="two">
        <Panel title="Allocation logic" action={<span className="badge assigned">ACTIVE</span>}>
          <div className="rule">
            <span>Ordering</span>
            <b>{config.ordering}</b>
          </div>
          <div className="rule">
            <span>Assignment policy</span>
            <b>{config.policy}</b>
          </div>
          <div className="rule">
            <span>Availability</span>
            <b>Shift + leave/WFH + cap</b>
          </div>
          <div className="rule">
            <span>Delivery</span>
            <b>Pull — assigned on &quot;start working&quot;</b>
          </div>
          <div className="rule">
            <span>Ticket source</span>
            <b>Inbound mail volume for the team</b>
          </div>
          <div className="notice" style={{ marginTop: 14 }}>
            The queue is ordered by SLA due time, with arrival time breaking ties
            within a band — time-based, but still FIFO among equally urgent work.
          </div>
        </Panel>

        <Panel
          title="Latest activity"
          action={
            <Link className="btn" href="/audit">
              Audit log
            </Link>
          }
        >
          <div className="timeline">
            {recent.length === 0 && <Empty>Nothing recorded yet.</Empty>}
            {recent.map((e) => (
              <div className="event" key={e.id}>
                <b>
                  {e.event}
                  {e.ticket ? ` — ${e.ticket.subject}` : ""}
                </b>
                <small>
                  {e.at.toLocaleTimeString()} · {e.actor}
                </small>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
