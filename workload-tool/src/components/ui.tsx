import Link from "next/link";
import type { ReactNode } from "react";

import type { TicketStatus } from "@/lib/domain/constants";

const STATUS_STYLES: Record<TicketStatus, string> = {
  NEW: "bg-slate-100 text-slate-700 ring-slate-300",
  ASSIGNED: "bg-blue-50 text-blue-700 ring-blue-300",
  IN_PROGRESS: "bg-indigo-50 text-indigo-700 ring-indigo-300",
  ON_HOLD: "bg-amber-50 text-amber-800 ring-amber-300",
  RESOLVED: "bg-emerald-50 text-emerald-700 ring-emerald-300",
  CLOSED: "bg-neutral-100 text-neutral-500 ring-neutral-300",
};

export function StatusBadge({ status }: { status: string }) {
  const style =
    STATUS_STYLES[status as TicketStatus] ?? "bg-neutral-100 text-neutral-600 ring-neutral-300";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${style}`}
    >
      {status.replace("_", " ")}
    </span>
  );
}

/**
 * Time remaining against the SLA, coloured by urgency.
 *
 * `now` is passed in rather than read here: reading the clock during render is
 * impure, and one clock per request keeps every row on the same instant.
 */
export function SlaCell({
  dueAt,
  status,
  now,
}: {
  dueAt: Date;
  status: string;
  now: Date;
}) {
  const settled = status === "RESOLVED" || status === "CLOSED";
  const ms = dueAt.getTime() - now.getTime();
  const minutes = Math.round(ms / 60_000);
  const breached = minutes < 0;

  const tone = settled
    ? "text-neutral-400"
    : breached
      ? "text-red-600 font-semibold"
      : minutes < 60
        ? "text-amber-700 font-medium"
        : "text-neutral-600";

  return (
    <span className={`tnum ${tone}`} title={dueAt.toLocaleString()}>
      {settled ? "—" : breached ? `breached ${formatSpan(-minutes)}` : formatSpan(minutes)}
    </span>
  );
}

function formatSpan(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export function Card({
  title,
  children,
  actions,
}: {
  title?: ReactNode;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="rounded border border-[var(--color-line)] bg-white">
      {(title || actions) && (
        <header className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-2.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {actions}
        </header>
      )}
      <div>{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="px-4 py-10 text-center text-sm text-[var(--color-ink-muted)]">
      {children}
    </p>
  );
}

export function ButtonLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
    >
      {children}
    </Link>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-xs text-red-800">
      {children}
    </p>
  );
}
