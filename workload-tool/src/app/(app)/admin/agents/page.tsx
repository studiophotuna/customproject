import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ROLES } from "@/lib/domain/constants";
import { Empty, PageHead, Panel } from "@/components/ui";
import { AdminForm } from "@/components/AdminForm";
import { addShiftAction, saveAgentAction } from "@/app/(app)/admin/actions";

export const dynamic = "force-dynamic";

/** datetime-local wants "YYYY-MM-DDTHH:mm" in local time. */
function localInput(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AgentsPage() {
  await requireRole("ADMIN");
  const now = new Date();

  const agents = await prisma.agent.findMany({
    orderBy: [{ active: "desc" }, { displayName: "asc" }],
    select: {
      id: true,
      adUpn: true,
      displayName: true,
      role: true,
      concurrentCap: true,
      active: true,
      shifts: {
        where: { endsAt: { gte: now } },
        orderBy: { startsAt: "asc" },
        take: 3,
        select: { id: true, startsAt: true, endsAt: true },
      },
    },
  });

  const shiftStart = new Date(now);
  shiftStart.setHours(9, 0, 0, 0);
  const shiftEnd = new Date(now);
  shiftEnd.setHours(17, 0, 0, 0);

  return (
    <>
      <PageHead
        title="Agents & Shifts"
        description="The people the allocator can assign to, and when they are on shift."
      />

      <Panel title={`${agents.length} agents`}>
        {agents.length === 0 ? (
          <Empty>No agents yet.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Role</th>
                <th>Cap</th>
                <th>Active</th>
                <th>Upcoming shifts</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id}>
                  <td>
                    <b>{a.displayName}</b>
                    <div style={{ color: "var(--muted)", fontSize: 11 }}>{a.adUpn}</div>
                  </td>
                  <td>
                    <span className="badge normal">{a.role}</span>
                  </td>
                  <td className="tnum">{a.concurrentCap}</td>
                  <td>
                    <span className={`badge ${a.active ? "ok" : "closed"}`}>
                      {a.active ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>
                    {a.shifts.length === 0
                      ? "none scheduled"
                      : a.shifts.map((s) => (
                          <div key={s.id} className="tnum">
                            {s.startsAt.toLocaleDateString()}{" "}
                            {s.startsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            –
                            {s.endsAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      <div className="two">
        <Panel title="Add or update an agent">
          <AdminForm action={saveAgentAction} submit="Save agent">
            <div className="formgrid">
              <div className="field full">
                <label htmlFor="adUpn">AD userPrincipalName</label>
                <input id="adUpn" name="adUpn" placeholder="first.last@contoso.local" required />
                <p style={{ color: "var(--muted)", fontSize: 11, margin: "5px 0 0" }}>
                  Matching an existing upn updates that agent rather than creating a duplicate.
                </p>
              </div>
              <div className="field">
                <label htmlFor="displayName">Display name</label>
                <input id="displayName" name="displayName" required />
              </div>
              <div className="field">
                <label htmlFor="role">Role</label>
                <select id="role" name="role" defaultValue="MEMBER">
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="concurrentCap">Concurrent cap</label>
                <input id="concurrentCap" name="concurrentCap" type="number" min={1} max={50} defaultValue={5} />
              </div>
              <div className="field">
                <label htmlFor="active">Active</label>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                  <input id="active" name="active" type="checkbox" defaultChecked style={{ width: "auto" }} />
                  Eligible for allocation
                </label>
              </div>
            </div>
          </AdminForm>
        </Panel>

        <Panel title="Schedule a shift">
          <AdminForm action={addShiftAction} submit="Add shift">
            <div className="formgrid">
              <div className="field full">
                <label htmlFor="agentId">Agent</label>
                <select id="agentId" name="agentId" required>
                  {agents
                    .filter((a) => a.active)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.displayName}
                      </option>
                    ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="startsAt">Starts</label>
                <input
                  id="startsAt"
                  name="startsAt"
                  type="datetime-local"
                  defaultValue={localInput(shiftStart)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="endsAt">Ends</label>
                <input
                  id="endsAt"
                  name="endsAt"
                  type="datetime-local"
                  defaultValue={localInput(shiftEnd)}
                  required
                />
              </div>
            </div>
            <div className="notice" style={{ marginTop: 12 }}>
              An agent with no shift covering the current moment is excluded from
              allocation, whatever their capacity.
            </div>
          </AdminForm>
        </Panel>
      </div>
    </>
  );
}
