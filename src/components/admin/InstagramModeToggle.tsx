"use client";

import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { saveInstagramMode } from "@/app/admin/(panel)/settings/actions";

export function InstagramModeToggle({ mode }: { mode: "auto" | "manual" }) {
  const [busy, start] = useTransition();

  const Option = ({ value, label, desc }: { value: "auto" | "manual"; label: string; desc: string }) => {
    const active = mode === value;
    return (
      <button
        type="button"
        disabled={busy || active}
        onClick={() => start(() => saveInstagramMode(value))}
        className={cn(
          "flex-1 rounded-md border p-4 text-left transition disabled:cursor-default",
          active ? "border-brand bg-brand-light" : "border-line hover:border-brand",
        )}
      >
        <span className="flex items-center gap-2 font-medium text-foreground">
          <span
            className={cn(
              "grid h-4 w-4 place-items-center rounded-full border",
              active ? "border-brand" : "border-line",
            )}
          >
            {active && <span className="h-2 w-2 rounded-full bg-brand" />}
          </span>
          {label}
        </span>
        <span className="mt-1 block pl-6 text-xs text-muted">{desc}</span>
      </button>
    );
  };

  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row">
      <Option value="auto" label="Automated" desc="Auto-pull recent posts from Instagram (Graph API)." />
      <Option value="manual" label="Manual" desc="Upload the photos to feature yourself — no token needed." />
    </div>
  );
}
