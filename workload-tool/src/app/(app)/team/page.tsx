import { requireRole } from "@/lib/auth";
import { startOfDay, utilizationFor } from "@/lib/db/metrics";
import { readSettings, utilizationTarget } from "@/lib/db/settings";
import { ACTIVITY_LABELS, formatDuration, type ActivityKind } from "@/lib/domain/work";
import { Empty, Initials, PageHead, Panel } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  await requireRole("MEMBER");
  const now = new Date();

  const [util, settings] = await Promise.all([
    utilizationFor(startOfDay(now), now),
    readSettings(),
  ]);
  const target = utilizationTarget(settings);

  return (
    <>
      <PageHead
        title="Team Capacity"
        description="Availability feeds the allocator; utilization is measured from recorded time, not estimated."
      />

      {util.length === 0 ? (
        <Panel>
          <Empty>No agents seeded.</Empty>
        </Panel>
      ) : (
        <div className="three">
          {util.map((u) => {
            const tone = u.utilization >= target ? "ok" : u.utilization >= target * 0.7 ? "warn" : "bad";
            return (
              <Panel key={u.agentId}>
                <div className="agent" style={{ borderBottom: 0, paddingTop: 0 }}>
                  <Initials name={u.displayName} />
                  <div className="agentmeta">
                    <b>{u.displayName}</b>
                    <small>
                      {u.role} ·{" "}
                      {u.clockedIn
                        ? ACTIVITY_LABELS[u.currentKind ?? "IDLE"]
                        : "not clocked in"}
                    </small>
                  </div>
                  <span className={`badge ${u.clockedIn ? "assigned" : "new"}`}>
                    {u.clockedIn ? "ON" : "OFF"}
                  </span>
                </div>

                <div style={{ marginTop: 13 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: "var(--muted)",
                    }}
                  >
                    <span>Utilization vs {target}% target</span>
                    <b className="tnum">{u.utilization}%</b>
                  </div>
                  <div className="progress" style={{ marginTop: 7 }}>
                    <i className={tone} style={{ width: `${Math.min(100, u.utilization)}%` }} />
                  </div>
                </div>

                <div style={{ marginTop: 13 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 11,
                      color: "var(--muted)",
                    }}
                  >
                    <span>Open workload</span>
                    <b className="tnum">
                      {u.openTickets} / {u.concurrentCap}
                    </b>
                  </div>
                  <div className="progress" style={{ marginTop: 7 }}>
                    <i
                      style={{
                        width: `${Math.min(100, (u.openTickets / Math.max(1, u.concurrentCap)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 14 }}>
                  {(Object.keys(u.byKind) as ActivityKind[])
                    .filter((k) => u.byKind[k] > 0)
                    .sort((a, b) => u.byKind[b] - u.byKind[a])
                    .map((k) => (
                      <div className="rule" key={k} style={{ padding: "7px 0", fontSize: 12 }}>
                        <span>{ACTIVITY_LABELS[k]}</span>
                        <b className="tnum">{formatDuration(u.byKind[k])}</b>
                      </div>
                    ))}
                  {u.loggedSeconds === 0 && (
                    <div className="notice" style={{ marginTop: 4 }}>
                      No time logged today.
                    </div>
                  )}
                </div>
              </Panel>
            );
          })}
        </div>
      )}
    </>
  );
}
