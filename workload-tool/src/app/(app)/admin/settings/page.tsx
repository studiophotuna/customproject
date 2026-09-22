import { requireRole, authMode } from "@/lib/auth";
import { readSettings } from "@/lib/db/settings";
import { SETTING_DEFINITIONS } from "@/lib/domain/work";
import { configFromEnv } from "@/lib/allocation/run";
import { PageHead, Panel } from "@/components/ui";
import { AdminForm } from "@/components/AdminForm";
import { saveSettingsAction } from "@/app/(app)/admin/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireRole("ADMIN");
  const [settings, config] = await Promise.all([
    readSettings(),
    Promise.resolve(configFromEnv()),
  ]);

  return (
    <>
      <PageHead
        title="Targets & Settings"
        description="Editable without a deployment. Changes take effect on the next page load."
      />

      <div className="two">
        <Panel title="Targets">
          <AdminForm action={saveSettingsAction} submit="Save targets">
            <div className="formgrid">
              {SETTING_DEFINITIONS.map((def) => (
                <div className="field full" key={def.key}>
                  <label htmlFor={def.key}>
                    {def.label} ({def.unit})
                  </label>
                  <input
                    id={def.key}
                    name={def.key}
                    defaultValue={settings[def.key]}
                    inputMode="decimal"
                  />
                  <p style={{ color: "var(--muted)", fontSize: 11, margin: "5px 0 0" }}>
                    {def.description}
                  </p>
                </div>
              ))}
            </div>
          </AdminForm>
        </Panel>

        <div>
          <Panel title="Environment">
            <div className="rule">
              <span>Auth mode</span>
              <b>{authMode().toUpperCase()}</b>
            </div>
            <div className="rule">
              <span>On-prem target</span>
              <b>IIS / Windows Auth</b>
            </div>
            <div className="rule">
              <span>Roles</span>
              <b>Admin · Manager · Leader · Member</b>
            </div>
            <div className="rule">
              <span>Ordering</span>
              <b>{config.ordering}</b>
            </div>
            <div className="rule">
              <span>Assignment policy</span>
              <b>{config.policy}</b>
            </div>
            <div className="rule">
              <span>Mail adapter</span>
              <b>{(process.env.MAIL_ADAPTER ?? "stub").toUpperCase()}</b>
            </div>
          </Panel>

          <Panel title="How utilization is measured" style={{ marginTop: 17 }}>
            <div className="notice">
              Utilization = time on tickets, meetings, ad-hoc work and training,
              divided by the daily productive target. Break and idle are recorded
              but excluded. A running timer counts towards today as it ticks, so
              the figure is live rather than only correct at the end of a shift.
            </div>
            <div className="notice" style={{ marginTop: 12 }}>
              Timeliness = resolved tickets whose resolution time beat the SLA due
              time that was snapshotted onto them at creation. Editing an SLA rule
              never moves the clock on tickets already in flight.
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
