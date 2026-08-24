"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/database.types";

export type ActionState = { ok?: boolean; error?: string } | null;

/**
 * Save a site_settings row. The stored JSON is built from the submitted fields,
 * so field names must match the keys the storefront reads (see lib/data.ts).
 * `delivery.points` is entered as one item per line and stored as an array.
 */
export async function saveSetting(
  key: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const value: Record<string, unknown> = {};

  for (const [k, v] of form.entries()) {
    if (k === "__key" || k === "points") continue;
    value[k] = typeof v === "string" ? v : "";
  }

  if (key === "delivery") {
    const raw = (form.get("points") ?? "").toString();
    value.points = raw
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value: value as Json }, { onConflict: "key" });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: true };
}
