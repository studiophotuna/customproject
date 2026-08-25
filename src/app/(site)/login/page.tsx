import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { CustomerLoginForm } from "@/components/auth/CustomerLoginForm";
import { getProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign In" };

export default async function LoginPage() {
  // Already signed in → go to the account page.
  if (await getProfile()) redirect("/account");

  return (
    <AuthCard title="Sign In" subtitle="Welcome back! Sign in to your account.">
      <Suspense>
        <CustomerLoginForm />
      </Suspense>
    </AuthCard>
  );
}
