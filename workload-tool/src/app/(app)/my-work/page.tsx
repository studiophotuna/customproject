import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { currentState } from "@/lib/db/work";
import { handleSecondsFor, startOfDay, utilizationFor } from "@/lib/db/metrics";
import { OPEN_STATUSES } from "@/lib/domain/constants";
import { ACTIVITY_LABELS, formatDuration, type ActivityKind } from "@/lib/domain/work";
import { Metric, PageHead, Panel, SlaCell, StatusBadge, Empty } from "@/components/ui";
import { WorkConsole } from "@/app/(app)/my-work/WorkConsole";
import { ResumeButton } from "@/app/(app)/my-work/ResumeButton";

export const dynamic = "force-dynamic";

export default async function MyWorkPage() {
  const identity = await requireRole("MEMBER");
  const now = new Date();
  const agentId = identity.agentId;

  const state = agentId
    ? await currentState(agentId)
    : {
        sessionId: null,
        sessionStartedAt: null,
        activityId: null,
        activityKind: null,
        activityStartedAt: null,
        ticket: null,
      };

  const [mine, util, handleSeconds, resolvedToday] = await Promise.all([
    agentId
      ? prisma.ticket.findMany({
          where: { currentAssigneeId: agentId, status: { in: [...OPEN_STATUSES] } },
          select: {
            id: true,
            subject: true,
            ticketType: true,
            status: true,
            dueAt: true,
            receivedAt: true,
            holdReason: true,
          },
          orderBy: [{ dueAt: "asc" }, { receivedAt: "asc" }],
        })
      : Promise.resolve([]),
    utilizationFor(startOfDay(now), now),
    state.ticket ? handleSecondsFor(state.ticket.id, now) : Promise.resolve(0),
    agentId
      ? prisma.ticket.count({
          where: { currentAssigneeId: agentId, resolvedAt: { gte: startOfDay(now) } },
        })
      : Promise.resolve(0),
  ]);

  const me = util.find((u) => u.agentId === agentId);

  return (
    <>
      <PageHead
        title="My Work"
        description="Start working and the next ticket is assigned to you automatically — nearest SLA deadline first, arrival order breaking ties."
      />

      <WorkConsole
        clockedIn={state.sessionId !== null}
        sessionStartedAt={state.sessionStartedAt?.toISOString() ?? null}
        activityKind={state.activityKind}
        activityStartedAt={state.activityStartedAt?.toISOString() ?? null}
        canBeAssigned={agentId !== null}
        ticket={
          state.ticket
            ? {
                id: state.ticket.id,
                subject: state.ticket.subject,
                ticketType: state.ticket.ticketType,
                status: state.ticket.status,
                body: state.ticket.body,
                dueAt: state.ticket.dueAt.toISOString(),
                receivedAt: state.ticket.receivedAt.toISOString(),
                handleSeconds,
              }
            : null
        }
      />

      <section className="cards" style={{ marginTop: 17 }}>
        <Metric
          label={`Utilization today (target ${me?.targetHours ?? 6.8}h)`}
          value={`${me?.utilization ?? 0}%`}
          sub={`${formatDuration(me?.productiveSeconds ?? 0)} productive`}
          bar={me?.utilization ?? 0}
        />
        <Metric
          label="Logged today"
          value={formatDuration(me?.loggedSeconds ?? 0)}
          sub="All activity, break included"
          tone="muted"
        />
        <Metric label="Resolved today" value={resolvedToday} tone="muted" sub="By you" />
        <Metric
          label="Open with you"
          value={`${mine.length} / ${me?.concurrentCap ?? 0}`}
          sub="Against your concurrent cap"
          tone="muted"
        />
      </section>

      <div className="two">
        <Panel title="Assigned to me">
          {mine.length === 0 ? (
            <Empty>Nothing assigned. Start working to be given a ticket.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>SLA left</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {mine.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link href={`/tickets/${t.id}`}>
                        <b>{t.subject}</b>
                      </Link>
                      {t.holdReason && t.status === "ON_HOLD" && (
                        <div style={{ color: "var(--amber)", fontSize: 11, marginTop: 3 }}>
                          Pending: {t.holdReason}
                        </div>
                      )}
                    </td>
                    <td style={{ color: "var(--muted)" }}>{t.ticketType}</td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td>
                      <SlaCell dueAt={t.dueAt} status={t.status} now={now} />
                    </td>
                    <td style={{ textAlign: "right" }}>
                      {state.sessionId && state.ticket?.id !== t.id && (
                        <ResumeButton ticketId={t.id} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>

        <Panel title="Where your time went today">
          {!me || me.loggedSeconds === 0 ? (
            <Empty>No time logged yet today.</Empty>
          ) : (
            <>
              {(Object.keys(me.byKind) as ActivityKind[])
                .filter((k) => me.byKind[k] > 0)
                .sort((a, b) => me.byKind[b] - me.byKind[a])
                .map((kind) => (
                  <div className="rule" key={kind}>
                    <span>{ACTIVITY_LABELS[kind]}</span>
                    <b className="tnum">{formatDuration(me.byKind[kind])}</b>
                  </div>
                ))}
              <div className="notice" style={{ marginTop: 14 }}>
                Utilization counts tickets, meetings, ad-hoc and training against
                a {me.targetHours}-hour day. Break and idle are excluded.
              </div>
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
