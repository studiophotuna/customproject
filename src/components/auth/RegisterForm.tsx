"use client";

import { useActionState } from "react";
import Link from "next/link";
import { registerCustomer, type AuthState } from "@/app/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(registerCustomer, null);

  if (state?.ok) {
    return (
      <div className="rounded-card border border-brand bg-brand-light p-6 text-center">
        <p className="font-medium text-brand">{state.message}</p>
        <Link href="/login" className="mt-3 inline-block text-sm text-brand underline">
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4">
      <div>
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" name="full_name" required autoComplete="name" />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required autoComplete="new-password" minLength={8} />
        <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
      </div>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <Button type="submit" size="lg" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Create Account"}
      </Button>
      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
