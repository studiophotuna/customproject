"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";

/**
 * Confirm-then-delete button. Takes a bound server action that performs the
 * delete. Shows an inline confirm to avoid accidental removals.
 */
export function DeleteButton({
  action,
  label = "Delete",
  compact = false,
}: {
  action: () => Promise<void>;
  label?: string;
  compact?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-2">
        <button
          onClick={() => startTransition(() => action())}
          disabled={pending}
          className="rounded-md bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Confirm"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-md border border-line px-2 py-1 text-xs"
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className={
        compact
          ? "text-muted hover:text-red-600"
          : "inline-flex items-center gap-1 rounded-md border border-line px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
      }
      aria-label={label}
    >
      <Trash2 className="h-4 w-4" />
      {!compact && label}
    </button>
  );
}
