import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/AuthCard";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { getProfile } from "@/lib/auth";

export const metadata: Metadata = { title: "Create Account" };

export default async function RegisterPage() {
  if (await getProfile()) redirect("/account");

  return (
    <AuthCard title="Create Account" subtitle="Join us for a sweeter experience.">
      <RegisterForm />
    </AuthCard>
  );
}
