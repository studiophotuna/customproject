"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import type { Database } from "@/lib/database.types";

type Role = Database["public"]["Enums"]["user_role"];

export async function updateRole(id: string, role: string): Promise<void> {
  await requireAdmin(); // only admins/owners may change roles
  const supabase = await createClient();
  await supabase.from("profiles").update({ role: role as Role }).eq("id", id);
  revalidatePath("/admin/users");
}
