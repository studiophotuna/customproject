"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { signOut } from "@/app/signin/actions";

interface Group {
  group: string;
  items: { href: string; label: string }[];
}

export function SideNav({
  groups,
  displayName,
  role,
  upn,
  mode,
}: {
  groups: Group[];
  displayName: string;
  role: string;
  upn: string;
  mode: string;
}) {
  const pathname = usePathname();

  // "/" would otherwise prefix-match everything, so it is compared exactly.
  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <aside className="sidebar">
      <div className="brand">
        Workload<span>Flow</span>
      </div>

      <div className="nav">
        {groups.map((g) => (
          <div key={g.group}>
            <div className="nav-title">{g.group}</div>
            {g.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={isActive(item.href) ? "active" : undefined}
              >
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </div>

      <div className="userbox">
        <b>{displayName}</b>
        <br />
        {mode.toUpperCase()} · {role}
        <br />
        <span style={{ color: "#9aa3af" }}>{upn}</span>
        {(mode === "demo" || mode === "dev") && (
          <form action={signOut} style={{ marginTop: 10 }}>
            <button className="btn" type="submit" style={{ width: "100%" }}>
              Switch user
            </button>
          </form>
        )}
      </div>
    </aside>
  );
}
