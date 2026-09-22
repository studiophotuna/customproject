"use client";

import { useActionState } from "react";

import type { AdminState } from "@/app/(app)/admin/actions";

/**
 * Shared wrapper for the admin forms: runs a server action, shows its error or
 * confirmation, and disables the submit while in flight.
 */
export function AdminForm({
  action,
  submit,
  children,
}: {
  action: (prev: AdminState, data: FormData) => Promise<AdminState>;
  submit: string;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(action, {});

  return (
    <form action={formAction}>
      {children}
      <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button className="btn primary" disabled={pending}>
          {pending ? "Saving…" : submit}
        </button>
        {state.error && <span style={{ color: "var(--red)", fontSize: 12 }}>{state.error}</span>}
        {state.ok && <span style={{ color: "var(--green)", fontSize: 12 }}>{state.ok}</span>}
      </div>
    </form>
  );
}
