import { authMode, getIdentity } from "@/lib/auth";
import { ConfigurationError } from "@/lib/auth/errors";
import { SetupNotice } from "@/components/SetupNotice";
import { prisma } from "@/lib/db/prisma";
import { chooseIdentity } from "@/app/signin/actions";
import { Initials } from "@/components/ui";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const ROLE_BLURB: Record<string, string> = {
  ADMIN: "Everything, including targets, users and schedules",
  MANAGER: "Team-wide reporting and allocation oversight",
  LEADER: "Allocation board, manual override and reassignment",
  MEMBER: "The work console — pull, work and resolve tickets",
};

export default async function SignInPage() {
  let mode;
  try {
    mode = authMode();
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return <SetupNotice detail={error.message} />;
    }
    throw error;
  }

  // Under Windows/Entra auth the identity arrives with the request; there is
  // nothing to choose.
  if (mode === "iis" || mode === "entra") redirect("/");

  let existing;
  try {
    existing = await getIdentity();
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return <SetupNotice detail={error.message} />;
    }
    throw error;
  }
  if (existing) redirect("/my-work");

  const agents = await prisma.agent.findMany({
    where: { active: true },
    select: { adUpn: true, displayName: true, role: true, concurrentCap: true },
    orderBy: [{ role: "asc" }, { displayName: "asc" }],
  });

  return (
    <div className="signin-wrap">
      <div className="signin">
        <div className="brand" style={{ padding: "0 0 6px", fontSize: 26 }}>
          Workload<span>Flow</span>
        </div>
        <p style={{ color: "var(--muted)", marginTop: 0 }}>
          Choose who to sign in as.
        </p>

        <div className="notice warn" style={{ margin: "16px 0 20px" }}>
          <b>Demonstration environment.</b> There is no password on this site —
          anyone with the link can pick any identity below. All people, tickets
          and numbers are fabricated sample data. The on-prem build authenticates
          with Windows Integrated Auth through IIS instead.
        </div>

        {agents.length === 0 ? (
          <p className="empty">No users have been seeded yet.</p>
        ) : (
          agents.map((agent) => (
            <form key={agent.adUpn} action={chooseIdentity}>
              <input type="hidden" name="upn" value={agent.adUpn} />
              <button className="pick" type="submit">
                <Initials name={agent.displayName} />
                <span style={{ flex: 1 }}>
                  <b style={{ display: "block" }}>{agent.displayName}</b>
                  <small style={{ color: "var(--muted)" }}>
                    {ROLE_BLURB[agent.role] ?? agent.adUpn}
                  </small>
                </span>
                <span className="badge normal">{agent.role}</span>
              </button>
            </form>
          ))
        )}
      </div>
    </div>
  );
}
