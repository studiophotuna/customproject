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

function s(v: unknown): string {
  return String(v ?? "").trim();
}

async function upsert(key: string, value: unknown): Promise<ActionState> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert({ key, value: value as Json }, { onConflict: "key" });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Save the primary navigation (submitted as a JSON string in `items`). */
export async function saveNavigation(_prev: ActionState, form: FormData): Promise<ActionState> {
  let parsed: unknown;
  try {
    parsed = JSON.parse((form.get("items") ?? "[]").toString());
  } catch {
    return { error: "Could not read the navigation data." };
  }
  const items = (Array.isArray(parsed) ? parsed : [])
    .map((it) => {
      const r = it as { label?: unknown; href?: unknown; children?: unknown };
      const children = (Array.isArray(r.children) ? r.children : [])
        .map((c) => {
          const cc = c as { label?: unknown; href?: unknown };
          return { label: s(cc.label), href: s(cc.href) };
        })
        .filter((c) => c.label && c.href);
      const item: { label: string; href: string; children?: typeof children } = {
        label: s(r.label),
        href: s(r.href),
      };
      if (children.length) item.children = children;
      return item;
    })
    .filter((it) => it.label && it.href);

  return upsert("navigation", { items });
}

/** Save the footer columns + newsletter toggle (`columns` JSON string). */
export async function saveFooter(_prev: ActionState, form: FormData): Promise<ActionState> {
  let parsed: unknown;
  try {
    parsed = JSON.parse((form.get("columns") ?? "[]").toString());
  } catch {
    return { error: "Could not read the footer data." };
  }
  const columns = (Array.isArray(parsed) ? parsed : [])
    .map((col) => {
      const r = col as { title?: unknown; links?: unknown };
      const links = (Array.isArray(r.links) ? r.links : [])
        .map((l) => {
          const ll = l as { label?: unknown; href?: unknown };
          return { label: s(ll.label), href: s(ll.href) };
        })
        .filter((l) => l.label && l.href);
      return { title: s(r.title), links };
    })
    .filter((c) => c.title);

  return upsert("footer", { columns, showNewsletter: form.get("showNewsletter") === "on" });
}
