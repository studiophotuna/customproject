"use client";

import { useActionState, useRef } from "react";
import { changePassword, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(changePassword, null);
  const formRef = useRef<HTMLFormElement>(null);

  // Clear the fields after a successful change.
  if (state?.ok) formRef.current?.reset();

  return (
    <form ref={formRef} action={action} className="grid max-w-sm gap-4">
      <div>
        <Label htmlFor="password">New password</Label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
      </div>
      <div>
        <Label htmlFor="confirm">Confirm new password</Label>
        <Input id="confirm" name="confirm" type="password" required autoComplete="new-password" minLength={8} />
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.ok && <p className="text-sm text-brand">{state.message}</p>}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  );
}
