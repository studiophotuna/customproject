import Link from "next/link";

import { authMode, can, getIdentity } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { switchDevIdentity } from "@/app/actions/dev-identity";

const NAV = [
  { href: "/queue", label: "Queue", minimum: "MEMBER" as const },
  { href: "/tickets/new", label: "New ticket", minimum: "MEMBER" as const },
  { href: "/leader", label: "Allocation board", minimum: "LEADER" as const },
];

export async function AppHeader() {
  const identity = await getIdentity();
  const mode = authMode();

  return (
    <header className="border-b border-[var(--color-line)] bg-white">
      <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-6 py-3">
        <Link href="/queue" className="text-sm font-semibold tracking-tight">
          Workload Allocation
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.filter((item) => can(identity, item.minimum)).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded px-2.5 py-1.5 text-xs font-medium text-[var(--color-ink-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-ink)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          {identity ? (
            <span className="text-xs text-[var(--color-ink-muted)]">
              {identity.displayName}{" "}
              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-700">
                {identity.role}
              </span>
            </span>
          ) : (
            <span className="text-xs text-red-600">not authenticated</span>
          )}
          {mode === "dev" && <DevIdentitySwitcher current={identity?.upn ?? ""} />}
        </div>
      </div>
    </header>
  );
}

/**
 * Dev-mode only: jump between seeded identities to exercise all four roles
 * without restarting. Never rendered under iis/entra.
 */
async function DevIdentitySwitcher({ current }: { current: string }) {
  const agents = await prisma.agent.findMany({
    where: { active: true },
    select: { adUpn: true, displayName: true, role: true },
    orderBy: [{ role: "asc" }, { displayName: "asc" }],
  });

  if (agents.length === 0) return null;

  return (
    <form action={switchDevIdentity} className="flex items-center gap-1.5">
      <span
        className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800"
        title="AUTH_MODE=dev — fake identity, local only"
      >
        dev
      </span>
      <select
        name="upn"
        defaultValue={current}
        className="rounded border border-[var(--color-line)] bg-white px-2 py-1 text-xs"
      >
        {agents.map((agent) => (
          <option key={agent.adUpn} value={agent.adUpn}>
            {agent.displayName} · {agent.role}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded border border-[var(--color-line)] px-2 py-1 text-xs hover:bg-[var(--color-surface-muted)]"
      >
        Switch
      </button>
    </form>
  );
}
