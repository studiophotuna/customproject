"use client";

import { useTransition } from "react";

/**
 * Inline status dropdown that fires a bound server action on change.
 * `action` receives the newly-selected value.
 */
export function StatusSelect({
  value,
  options,
  action,
}: {
  value: string;
  options: readonly string[];
  action: (value: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={value}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value;
        startTransition(() => action(v));
      }}
      className="rounded-md border border-line bg-background px-2 py-1 text-xs capitalize outline-none focus:border-brand disabled:opacity-60"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
