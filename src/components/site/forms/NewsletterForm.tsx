"use client";

import { useActionState } from "react";
import { subscribeNewsletter, type FormState } from "@/app/actions/forms";

export function NewsletterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    subscribeNewsletter,
    null,
  );

  return (
    <div>
      <form action={action} className="flex gap-2">
        <input
          type="email"
          name="email"
          required
          placeholder="Enter your email"
          aria-label="Email address"
          className="min-w-0 flex-1 rounded-card border border-line bg-background px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-card bg-brand px-4 py-2 text-sm text-on-brand hover:bg-brand-dark disabled:opacity-60"
        >
          {pending ? "…" : "→"}
        </button>
      </form>
      {state && (
        <p className={`mt-2 text-xs ${state.ok ? "text-brand" : "text-red-600"}`}>
          {state.message}
        </p>
      )}
    </div>
  );
}
