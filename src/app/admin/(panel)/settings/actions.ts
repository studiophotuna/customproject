"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { uploadMedia } from "@/lib/admin/media";
import { runInstagramSync, readInstagramToken } from "@/lib/admin/instagram-sync";
import type { Json } from "@/lib/database.types";

export type ActionState = { ok?: boolean; error?: string; message?: string } | null;

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

/** Upload a logo image and store its URL (setting key `logo`). */
export async function saveLogo(_prev: ActionState, form: FormData): Promise<ActionState> {
  const file = form.get("logo") as File | null;
  if (!file || file.size === 0) return { error: "Please choose an image to upload." };

  const supabase = await createClient();
  let url: string | null;
  try {
    url = await uploadMedia(supabase, file, "brand");
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!url) return { error: "Upload failed. Please try again." };

  return upsert("logo", { url });
}

/** Remove the uploaded logo (reverts to the text wordmark). */
export async function removeLogo(): Promise<void> {
  const supabase = await createClient();
  await supabase.from("site_settings").delete().eq("key", "logo");
  revalidatePath("/", "layout");
}

/**
 * Save an Instagram token (if provided) and sync recent posts into the public
 * feed. Runs as the current staff user (RLS-protected private_settings).
 */
export async function saveAndSyncInstagram(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const token = s(form.get("token"));
  const userLabel = s(form.get("userLabel"));
  const supabase = await createClient();
  try {
    const { count } = await runInstagramSync(supabase, {
      token: token || undefined,
      userLabel: userLabel || undefined,
      refresh: true,
    });
    revalidatePath("/", "layout");
    return { ok: true, message: `Connected — synced ${count} post${count === 1 ? "" : "s"}.` };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

/** Re-fetch posts using the stored token. */
export async function syncInstagramNow(): Promise<void> {
  const supabase = await createClient();
  try {
    await runInstagramSync(supabase, { refresh: false });
  } catch {
    // surfaced on next page load via status; ignore here
  }
  revalidatePath("/", "layout");
}

/** Disconnect Instagram: clear the token and the cached feed. */
export async function disconnectInstagram(): Promise<void> {
  const supabase = await createClient();
  await supabase.from("private_settings").delete().eq("key", "instagram");
  await supabase.from("site_settings").delete().eq("key", "instagram_feed");
  revalidatePath("/", "layout");
}

/** Choose whether the Instagram feed is auto-synced or manually curated. */
export async function saveInstagramMode(mode: string): Promise<void> {
  const value = mode === "manual" ? "manual" : "auto";
  await upsert("instagram_mode", { mode: value });
}

/** Add one manually-curated feed image (upload + optional link/caption). */
export async function addManualInstagramImage(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const file = form.get("image") as File | null;
  if (!file || file.size === 0) return { error: "Please choose an image." };

  const supabase = await createClient();
  let url: string | null;
  try {
    url = await uploadMedia(supabase, file, "instagram");
  } catch (e) {
    return { error: (e as Error).message };
  }
  if (!url) return { error: "Upload failed. Please try again." };

  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "instagram_manual")
    .maybeSingle();
  const items = ((data?.value as { items?: unknown[] })?.items ?? []) as unknown[];

  const next = [
    ...items,
    {
      id: crypto.randomUUID(),
      mediaUrl: url,
      permalink: s(form.get("permalink")),
      caption: s(form.get("caption")),
    },
  ];

  const res = await upsert("instagram_manual", { items: next });
  return res?.error ? res : { ok: true, message: "Image added." };
}

/** Remove one manually-curated feed image by id. */
export async function removeManualInstagramImage(id: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "instagram_manual")
    .maybeSingle();
  const items = ((data?.value as { items?: { id?: string }[] })?.items ?? []).filter(
    (it) => it.id !== id,
  );
  await upsert("instagram_manual", { items });
}

/** Connection status for the admin UI. */
export async function getInstagramStatus(): Promise<{
  connected: boolean;
  userLabel?: string;
  lastSyncedAt?: string;
  expiresAt?: string;
  count: number;
}> {
  const supabase = await createClient();
  const stored = await readInstagramToken(supabase);
  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "instagram_feed")
    .maybeSingle();
  const items = (data?.value as { items?: unknown[] })?.items ?? [];
  return {
    connected: Boolean(stored.token),
    userLabel: stored.userLabel,
    lastSyncedAt: stored.lastSyncedAt,
    expiresAt: stored.expiresAt,
    count: items.length,
  };
}
