import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/database.types";
import { fetchInstagramMedia, refreshLongLivedToken } from "@/lib/instagram";

type Client = SupabaseClient<Database>;

type StoredToken = {
  token?: string;
  userLabel?: string;
  expiresAt?: string;
  lastSyncedAt?: string;
};

/** Read the stored Instagram token record (staff/service-role only). */
export async function readInstagramToken(supabase: Client): Promise<StoredToken> {
  const { data } = await supabase
    .from("private_settings")
    .select("value")
    .eq("key", "instagram")
    .maybeSingle();
  return (data?.value as StoredToken) ?? {};
}

/**
 * Fetch recent posts and cache them into the public `instagram_feed` setting.
 * Optionally refreshes the long-lived token. Throws on API/DB error.
 */
export async function runInstagramSync(
  supabase: Client,
  opts?: { token?: string; userLabel?: string; refresh?: boolean },
): Promise<{ count: number }> {
  const stored = await readInstagramToken(supabase);
  const token = (opts?.token || stored.token || "").trim();
  if (!token) throw new Error("No Instagram access token configured.");

  const items = await fetchInstagramMedia(token, 8);

  const { error: feedErr } = await supabase.from("site_settings").upsert(
    {
      key: "instagram_feed",
      value: { items, updatedAt: new Date().toISOString() } as unknown as Json,
    },
    { onConflict: "key" },
  );
  if (feedErr) throw new Error(feedErr.message);

  let toStore: StoredToken = {
    ...stored,
    token,
    userLabel: opts?.userLabel ?? stored.userLabel,
    lastSyncedAt: new Date().toISOString(),
  };

  if (opts?.refresh) {
    const refreshed = await refreshLongLivedToken(token);
    if (refreshed) {
      toStore = {
        ...toStore,
        token: refreshed.token,
        expiresAt: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
      };
    }
  }

  const { error: tokErr } = await supabase
    .from("private_settings")
    .upsert({ key: "instagram", value: toStore as unknown as Json }, { onConflict: "key" });
  if (tokErr) throw new Error(tokErr.message);

  return { count: items.length };
}
