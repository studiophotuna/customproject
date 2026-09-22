import { requireRole } from "@/lib/auth";
import {
  activityMix,
  backlog,
  byComplexity,
  byTicketType,
  topPendingReasons,
  volumeByDay,
  volumeByHour,
} from "@/lib/db/analytics";
import { dashboardStats, startOfDay, utilizationFor } from "@/lib/db/metrics";
import { readSettings, timelinessTarget, utilizationTarget } from "@/lib/db/settings";
import { ACTIVITY_LABELS, formatDuration } from "@/lib/domain/work";
import { COMPLEXITY_WEIGHT } from "@/lib/domain/constants";
import { Empty, Metric, PageHead, Panel } from "@/components/ui";
import {
  ColumnChart,
  DataTable,
  GroupedBars,
  RankedBars,
  StackedShare,
  VIZ,
} from "@/components/charts";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  await requireRole("MANAGER");
  const now = new Date();

  const [
    stats,
    days,
    hours,
    complexity,
    reasons,
    queue,
    types,
    mix,
    util,
    settings,
  ] = await Promise.all([
    dashboardStats(now),
    volumeByDay(14, now),
    volumeByHour(30, now),
    byComplexity(30, now),
    topPendingReasons(8, 30, now),
    backlog(),
    byTicketType(30, now),
    activityMix(7, now),
    utilizationFor(startOfDay(now), now),
    readSettings(),
  ]);

  const utilTarget = utilizationTarget(settings);
  const timeTarget = timelinessTarget(settings);

  const received14 = days.reduce((s, d) => s + d.received, 0);
  const resolved14 = days.reduce((s, d) => s + d.resolved, 0);
  const onTime14 = days.reduce((s, d) => s + d.onTime, 0);
  const breached14 = days.reduce((s, d) => s + d.breached, 0);
  const clearance = received14 > 0 ? Math.round((resolved14 / received14) * 1000) / 10 : 0;
  // Headline and subtitle must describe the same window: reading the figure
  // from today's stats while captioning it with 14-day counts showed "0%" next
  // to "2 on time", which reads as a bug.
  const timeliness14 =
    resolved14 > 0 ? Math.round((onTime14 / resolved14) * 1000) / 10 : 0;

  const peak = hours.reduce((a, b) => (b.count > a.count ? b : a), hours[0]);
  const totalBacklog = queue.reduce((s, r) => s + r.count, 0);
  const oldest = queue
    .map((r) => r.oldestReceivedAt)
    .filter((d): d is Date => d !== null)
    .sort((a, b) => a.getTime() - b.getTime())[0];

  const weighted = complexity.reduce(
    (s, c) => s + c.resolved * COMPLEXITY_WEIGHT[c.complexity],
    0
  );

  return (
    <>
      <PageHead
        title="Insights"
        description="Where the work comes from, how fast it clears, and what it costs — measured from recorded time, not estimates."
      />

      <section className="cards">
        <Metric
          label="Received (14 days)"
          value={received14}
          sub={`${(received14 / 14).toFixed(1)} per day average`}
          tone="muted"
        />
        <Metric
          label="Clearance rate"
          value={`${clearance}%`}
          sub={clearance >= 100 ? "Keeping pace with intake" : "Falling behind intake"}
          tone={clearance >= 100 ? "good" : "warn"}
          bar={Math.min(100, clearance)}
        />
        <Metric
          label={`Timeliness, 14 days (target ${timeTarget}%)`}
          value={resolved14 > 0 ? `${timeliness14}%` : "—"}
          sub={
            resolved14 > 0
              ? `${onTime14} on time · ${breached14} breached of ${resolved14} resolved`
              : "Nothing resolved in this period"
          }
          tone={resolved14 === 0 ? "muted" : timeliness14 >= timeTarget ? "good" : "bad"}
          bar={resolved14 > 0 ? timeliness14 : undefined}
        />
        <Metric
          label={`Team utilization (target ${utilTarget}%)`}
          value={`${stats.teamUtilization}%`}
          sub={`${stats.clockedIn} of ${stats.headcount} clocked in`}
          tone={stats.teamUtilization >= utilTarget ? "good" : "warn"}
          bar={stats.teamUtilization}
        />
      </section>

      <div className="two even">
        <Panel title="Intake vs cleared — last 14 days">
          <GroupedBars
            data={days.map((d) => ({ label: d.label, a: d.received, b: d.resolved }))}
            labelA="Received"
            labelB="Resolved"
          />
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 0 }}>
            Bars are counts per day, not a running total. When the orange bar sits
            below the blue one consistently, the backlog is growing regardless of
            how good timeliness looks.
          </p>
          <DataTable
            caption="intake vs cleared"
            head={["Day", "Received", "Resolved", "On time", "Breached"]}
            rows={days.map((d) => [d.label, d.received, d.resolved, d.onTime, d.breached])}
          />
        </Panel>

        <Panel title="When requests arrive — by hour, last 30 days">
          <ColumnChart data={hours.map((h) => ({ label: h.label, value: h.count }))} unit=":00" />
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 0 }}>
            The arrival profile of the team&apos;s mailbox. Busiest hour is{" "}
            <b>
              {peak?.label}:00 with {peak?.count}
            </b>
            . Shift patterns should cover the peak, not the daily average.
          </p>
          <DataTable
            caption="arrivals by hour"
            head={["Hour", "Received"]}
            rows={hours.filter((h) => h.count > 0).map((h) => [`${h.label}:00`, h.count])}
          />
        </Panel>
      </div>

      <div className="two even">
        <Panel title="Complexity — reporting only, never allocation">
          <div className="notice" style={{ marginBottom: 14 }}>
            Complexity is recorded for productivity analysis and is deliberately
            invisible to the allocator. The queue stays priority-banded FIFO, so a
            hard ticket never gets pushed behind an easy one of equal urgency.
            A check in <code>npm run check:core</code> fails the build if this
            field ever reaches the allocation code.
          </div>

          <StackedShare
            segments={complexity.map((c, i) => ({
              label: c.complexity,
              value: c.total,
              color: VIZ.ordinal[i],
            }))}
          />

          <table className="table" style={{ marginTop: 6 }}>
            <thead>
              <tr>
                <th>Band</th>
                <th>Received</th>
                <th>Resolved</th>
                <th>Avg worked</th>
                <th>On time</th>
              </tr>
            </thead>
            <tbody>
              {complexity.map((c) => (
                <tr key={c.complexity}>
                  <td>
                    <b>{c.complexity}</b>
                  </td>
                  <td className="tnum">{c.total}</td>
                  <td className="tnum">{c.resolved}</td>
                  <td className="tnum">
                    {c.avgHandleSeconds ? formatDuration(c.avgHandleSeconds) : "—"}
                  </td>
                  <td className="tnum">{c.resolved ? `${c.onTimePct}%` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 0 }}>
            Weighted output over 30 days: <b>{weighted} points</b> (LOW 1, MEDIUM 2,
            HIGH 3). A fairer productivity measure than a raw ticket count, because
            it does not reward whoever happened to draw simple work.
          </p>
        </Panel>

        <Panel title="Why work stalls — pending reasons, last 30 days">
          {reasons.length === 0 ? (
            <Empty>Nothing has been marked pending yet.</Empty>
          ) : (
            <>
              <RankedBars
                data={reasons.map((r) => ({ label: r.reason, value: r.count }))}
                color={VIZ.seriesB}
              />
              <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 0 }}>
                Free text today. This ranking is the evidence for the picklist —
                the entries at the top become the options, and anything left over
                stays as &ldquo;Other&rdquo; with a free-text box.
              </p>
            </>
          )}
        </Panel>
      </div>

      <div className="two even">
        <Panel title="Backlog right now">
          <RankedBars
            data={queue.map((r) => ({
              label: r.status.replace("_", " "),
              value: r.count,
              note: r.oldestReceivedAt
                ? `oldest ${Math.floor((now.getTime() - r.oldestReceivedAt.getTime()) / 3_600_000)}h`
                : undefined,
            }))}
          />
          <div className="rule" style={{ marginTop: 6 }}>
            <span>Total in flight</span>
            <b className="tnum">{totalBacklog}</b>
          </div>
          {oldest && (
            <div className="rule">
              <span>Longest waiting</span>
              <b className="tnum">
                {Math.floor((now.getTime() - oldest.getTime()) / 3_600_000)}h
              </b>
            </div>
          )}
        </Panel>

        <Panel title="Request types under strain — last 30 days">
          {types.length === 0 ? (
            <Empty>No tickets in this period.</Empty>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Received</th>
                  <th>Breached</th>
                  <th>Breach rate</th>
                </tr>
              </thead>
              <tbody>
                {types.map((t) => {
                  const rate = t.received ? Math.round((t.breached / t.received) * 100) : 0;
                  return (
                    <tr key={t.ticketType}>
                      <td>{t.ticketType}</td>
                      <td className="tnum">{t.received}</td>
                      <td className="tnum">{t.breached}</td>
                      <td>
                        <span className={`badge ${rate === 0 ? "ok" : rate < 20 ? "warn" : "bad"}`}>
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 0 }}>
            A type breaching consistently usually means its SLA target is wrong,
            not that people are slow. Adjust it on the SLA Rules screen — tickets
            already in flight keep the target snapshotted at creation.
          </p>
        </Panel>
      </div>

      <div className="two even">
        <Panel title="Utilization by person — today">
          <RankedBars
            data={util.map((u) => ({
              label: `${u.displayName}${u.clockedIn ? "" : " (off)"}`,
              value: u.utilization,
              note: formatDuration(u.productiveSeconds),
            }))}
            suffix="%"
            max={Math.max(100, ...util.map((u) => u.utilization))}
            marker={{ value: utilTarget, label: `the ${utilTarget}% target` }}
          />
          <DataTable
            caption="utilization by person"
            head={["Person", "Utilization %", "Productive", "Logged", "Open tickets"]}
            rows={util.map((u) => [
              u.displayName,
              u.utilization,
              formatDuration(u.productiveSeconds),
              formatDuration(u.loggedSeconds),
              `${u.openTickets}/${u.concurrentCap}`,
            ])}
          />
        </Panel>

        <Panel title="Where the team's time goes — last 7 days">
          {mix.length === 0 ? (
            <Empty>No time recorded yet.</Empty>
          ) : (
            <>
              <StackedShare
                segments={mix.map((m, i) => ({
                  label: ACTIVITY_LABELS[m.kind],
                  value: Math.round(m.seconds / 60),
                  color: m.productive ? VIZ.ordinal[i % VIZ.ordinal.length] : VIZ.muted,
                }))}
                caption={
                  <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
                    Minutes. Grey segments are break and idle — recorded, but
                    excluded from utilization.
                  </p>
                }
              />
              <DataTable
                caption="activity mix"
                head={["Activity", "Time", "Counts towards utilization"]}
                rows={mix.map((m) => [
                  ACTIVITY_LABELS[m.kind],
                  formatDuration(m.seconds),
                  m.productive ? "yes" : "no",
                ])}
              />
            </>
          )}
        </Panel>
      </div>
    </>
  );
}
