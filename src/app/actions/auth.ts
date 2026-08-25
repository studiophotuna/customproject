"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { ok?: boolean; error?: string; message?: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

function field(form: FormData, key: string): string {
  return (form.get(key) ?? "").toString();
}

/** Customer sign-in. Redirects to `next` (or /account) on success. */
export async function signInCustomer(_prev: AuthState, form: FormData): Promise<AuthState> {
  const email = field(form, "email").trim();
  const password = field(form, "password");
  const next = field(form, "next") || "/account";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { error: error?.message ?? "Sign in failed." };
  }
  redirect(next.startsWith("/") ? next : "/account");
}

/** Customer registration. Honours Supabase email-confirmation settings. */
export async function registerCustomer(_prev: AuthState, form: FormData): Promise<AuthState> {
  const fullName = field(form, "full_name").trim();
  const email = field(form, "email").trim();
  const password = field(form, "password");

  if (!EMAIL_RE.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl()}/login`,
    },
  });
  if (error) return { error: error.message };

  // If confirmations are off, a session exists — go straight in.
  if (data.session) {
    redirect("/account");
  }
  return {
    ok: true,
    message: "Account created! Please check your email to confirm your address, then sign in.",
  };
}

/** Sign out and return to the storefront home. */
export async function signOutToHome(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Change the current user's password (works for customers and staff). */
export async function changePassword(_prev: AuthState, form: FormData): Promise<AuthState> {
  const password = field(form, "password");
  const confirm = field(form, "confirm");

  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: true, message: "Password updated." };
}

/** Update the current user's profile (name, phone). */
export async function updateProfile(_prev: AuthState, form: FormData): Promise<AuthState> {
  const full_name = field(form, "full_name").trim() || null;
  const phone = field(form, "phone").trim() || null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };

  const { error } = await supabase.from("profiles").update({ full_name, phone }).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/account");
  return { ok: true, message: "Profile updated." };
}
