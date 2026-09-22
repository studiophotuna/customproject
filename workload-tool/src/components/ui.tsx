import type { ReactNode } from "react";

import type { TicketStatus } from "@/lib/domain/constants";

const STATUS_CLASS: Record<string, string> = {
  NEW: "new",
  ASSIGNED: "assigned",
  IN_PROGRESS: "inprogress",
  ON_HOLD: "onhold",
  RESOLVED: "resolved",
  CLOSED: "closed",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_CLASS[status] ?? "new"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

/** SLA urgency, derived from a single per-request clock passed in by the page. */
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
  const minutes = Math.round((dueAt.getTime() - now.getTime()) / 60_000);

  if (settled) return <span className="tnum" style={{ color: "var(--muted)" }}>—</span>;

  const style =
    minutes < 0
      ? { color: "var(--red)", fontWeight: 700 }
      : minutes < 60
        ? { color: "var(--amber)", fontWeight: 600 }
        : { color: "var(--muted)" };

  return (
    <span className="tnum" style={style} title={dueAt.toLocaleString()}>
      {minutes < 0 ? `breached ${span(-minutes)}` : span(minutes)}
    </span>
  );
}

function span(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h}h ${minutes % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export function Panel({
  title,
  action,
  children,
  style,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <section className="panel" style={style}>
      {(title || action) && (
        <div className="panelhead">
          <h2>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Metric({
  label,
  value,
  sub,
  tone = "muted",
  bar,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "good" | "warn" | "bad" | "muted";
  bar?: number;
}) {
  const toneClass = tone === "good" ? "" : tone === "warn" ? "warn" : tone === "bad" ? "bad" : "muted";
  return (
    <div className="card">
      <div className="metric-label">{label}</div>
      <div className="metric">{value}</div>
      {sub !== undefined && <div className={`sub ${toneClass}`}>{sub}</div>}
      {bar !== undefined && (
        <div className="progress" style={{ marginTop: 9 }}>
          <i
            className={bar >= 85 ? "ok" : bar >= 60 ? "warn" : "bad"}
            style={{ width: `${Math.min(100, Math.max(0, bar))}%` }}
          />
        </div>
      )}
    </div>
  );
}

export function PageHead({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="topbar">
      <div className="heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="actions">{actions}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>;
}

export function Initials({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return <div className="avatar">{initials}</div>;
}

export function statusOf(s: string): TicketStatus {
  return s as TicketStatus;
}
