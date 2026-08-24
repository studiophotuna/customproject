import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/database.types";

export type Profile = Tables<"profiles">;
export type Role = Profile["role"];

const STAFF_ROLES: Role[] = ["owner", "admin", "staff"];
const ADMIN_ROLES: Role[] = ["owner", "admin"];

/** The current signed-in profile, or null. */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  return data ?? null;
}

/** Require a staff/admin/owner user; redirect to login otherwise. */
export async function requireStaff(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile || !STAFF_ROLES.includes(profile.role)) {
    redirect("/admin/login");
  }
  return profile;
}

/** Require an admin/owner user; redirect otherwise. */
export async function requireAdmin(): Promise<Profile> {
  const profile = await getProfile();
  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    redirect("/admin");
  }
  return profile;
}

export function isAdminRole(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}
