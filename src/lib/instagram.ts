import "server-only";

/**
 * Instagram Graph API helpers (Instagram Basic Display successor).
 * Docs: https://developers.facebook.com/docs/instagram-platform
 *
 * We use a long-lived user access token (from a Business/Creator account) to
 * read the account's own media, and to refresh the token before it expires.
 */

export type InstagramItem = {
  id: string;
  mediaUrl: string;
  permalink: string;
  caption: string;
};

type GraphMedia = {
  id: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  thumbnail_url?: string;
  permalink: string;
  caption?: string;
};

const GRAPH = "https://graph.instagram.com";

/** Fetch the most recent media for the token's account. Throws on API error. */
export async function fetchInstagramMedia(
  token: string,
  limit = 8,
): Promise<InstagramItem[]> {
  const fields = "id,media_type,media_url,thumbnail_url,permalink,caption";
  const url = `${GRAPH}/me/media?fields=${fields}&limit=${limit}&access_token=${encodeURIComponent(token)}`;

  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  if (!res.ok) {
    const msg = json?.error?.message || `Instagram API error (${res.status})`;
    throw new Error(msg);
  }

  const data: GraphMedia[] = json.data ?? [];
  return data
    .map((m) => ({
      id: m.id,
      // Videos expose only a thumbnail; images/albums use media_url.
      mediaUrl: m.media_type === "VIDEO" ? m.thumbnail_url ?? "" : m.media_url ?? "",
      permalink: m.permalink,
      caption: m.caption ?? "",
    }))
    .filter((m) => m.mediaUrl);
}

/**
 * Refresh a long-lived token (valid 60 days, refreshable once older than 24h).
 * Returns the new token and its lifetime in seconds, or null if it failed.
 */
export async function refreshLongLivedToken(
  token: string,
): Promise<{ token: string; expiresIn: number } | null> {
  const url = `${GRAPH}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(token)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    const json = await res.json();
    if (!res.ok || !json.access_token) return null;
    return { token: json.access_token, expiresIn: json.expires_in ?? 0 };
  } catch {
    return null;
  }
}
