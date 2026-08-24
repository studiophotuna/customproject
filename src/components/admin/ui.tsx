import Link from "next/link";
import { cn } from "@/lib/utils";

/** Admin page header with optional action slot. */
export function AdminHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number | string;
  href?: string;
}) {
  const body = (
    <div className="rounded-card border border-line bg-background p-5 transition hover:border-brand">
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-foreground">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}

/** Simple bordered card/panel. */
export function Panel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-card border border-line bg-background", className)}>
      {children}
    </div>
  );
}

/** Status pill. */
export function Badge({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "brand" | "muted" | "green" | "amber" | "red";
}) {
  const tones: Record<string, string> = {
    brand: "bg-brand-light text-brand",
    muted: "bg-surface-muted text-muted",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize",
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
