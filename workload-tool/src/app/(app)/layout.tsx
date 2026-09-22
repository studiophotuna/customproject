import { redirect } from "next/navigation";

import { authMode, getIdentity, isOpenDemo } from "@/lib/auth";
import { hasAtLeast, type Role } from "@/lib/domain/constants";
import { SideNav } from "@/components/SideNav";

export const dynamic = "force-dynamic";

interface NavItem {
  href: string;
  label: string;
  minimum: Role;
}

const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "Workspace",
    items: [
      { href: "/my-work", label: "My Work", minimum: "MEMBER" },
      { href: "/", label: "Queue Dashboard", minimum: "MEMBER" },
      { href: "/tickets", label: "All Tickets", minimum: "MEMBER" },
      { href: "/team", label: "Team Capacity", minimum: "MEMBER" },
    ],
  },
  {
    group: "Management",
    items: [
      { href: "/allocation", label: "Allocation Monitor", minimum: "LEADER" },
      { href: "/sla", label: "SLA Rules", minimum: "LEADER" },
      { href: "/audit", label: "Audit Log", minimum: "LEADER" },
    ],
  },
  {
    group: "Administration",
    items: [
      { href: "/admin/agents", label: "Agents & Shifts", minimum: "ADMIN" },
      { href: "/admin/settings", label: "Targets & Settings", minimum: "ADMIN" },
    ],
  },
];

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const identity = await getIdentity();

  // No identity: in the modes that have a picker, send them to it. Under
  // Windows/Entra auth an absent identity is a misconfiguration, not a prompt.
  if (!identity) {
    const mode = authMode();
    if (mode === "demo" || mode === "dev") redirect("/signin");
    throw new Error(
      "Not authenticated. Check that Anonymous Authentication is disabled and " +
        "Windows Authentication is enabled on the IIS site."
    );
  }

  const groups = NAV.map((g) => ({
    group: g.group,
    items: g.items.filter((i) => hasAtLeast(identity.role, i.minimum)),
  })).filter((g) => g.items.length > 0);

  return (
    <>
      {isOpenDemo() && (
        <div className="demo-banner">
          <b>Demo environment</b> — no authentication, fabricated sample data.
          Do not enter real work requests or personal information.
        </div>
      )}
      <SideNav
        groups={groups}
        displayName={identity.displayName}
        role={identity.role}
        upn={identity.upn}
        mode={authMode()}
      />
      <main className="main">{children}</main>
    </>
  );
}
