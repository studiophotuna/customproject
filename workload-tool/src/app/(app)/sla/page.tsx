import { requireRole, can, getIdentity } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { Empty, PageHead, Panel } from "@/components/ui";
import { AdminForm } from "@/components/AdminForm";
import { saveSlaAction } from "@/app/(app)/admin/actions";

export const dynamic = "force-dynamic";

function humanise(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = minutes / 60;
  if (hours < 24) return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} hours`;
  const days = hours / 8; // business days at 8 productive hours
  return `${Number.isInteger(days) ? days : days.toFixed(1)} business days`;
}

export default async function SlaPage() {
  await requireRole("LEADER");
  const identity = await getIdentity();
  const isAdmin = can(identity, "ADMIN");

  const rules = await prisma.slaRule.findMany({ orderBy: { slaMinutes: "asc" } });

  return (
    <>
      <PageHead
        title="SLA Rules"
        description="The SLA is snapshotted onto each ticket when it is created, so editing a rule never moves the clock on work already in flight."
      />

      <Panel title={`${rules.length} rules`}>
        {rules.length === 0 ? (
          <Empty>No SLA rules configured.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Ticket type</th>
                <th>Target</th>
                <th>Clock</th>
                <th>Active</th>
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.ticketType}</b>
                  </td>
                  <td className="tnum">{humanise(r.slaMinutes)}</td>
                  <td>
                    <span className={`badge ${r.businessHoursOnly ? "normal" : "high"}`}>
                      {r.businessHoursOnly ? "BUSINESS HOURS" : "CALENDAR HOURS"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${r.active ? "ok" : "closed"}`}>
                      {r.active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {isAdmin && (
        <Panel title="Add or update a rule" style={{ marginTop: 17 }}>
          <AdminForm action={saveSlaAction} submit="Save rule">
            <div className="formgrid">
              <div className="field">
                <label htmlFor="ticketType">Ticket type</label>
                <input id="ticketType" name="ticketType" required placeholder="Incident - Critical" />
              </div>
              <div className="field">
                <label htmlFor="slaMinutes">Target (minutes)</label>
                <input id="slaMinutes" name="slaMinutes" type="number" min={1} defaultValue={240} required />
              </div>
              <div className="field">
                <label>Clock</label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <input name="businessHoursOnly" type="checkbox" defaultChecked style={{ width: "auto" }} />
                  Business hours only
                </label>
              </div>
              <div className="field">
                <label>Active</label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <input name="active" type="checkbox" defaultChecked style={{ width: "auto" }} />
                  Available for new tickets
                </label>
              </div>
            </div>
            <div className="notice" style={{ marginTop: 12 }}>
              Business-hours targets walk the configured working week. Public
              holidays are not implemented yet — that calendar remains a hook.
            </div>
          </AdminForm>
        </Panel>
      )}
    </>
  );
}
