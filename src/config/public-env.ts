/**
 * Public Supabase connection values.
 *
 * These are PUBLIC by design — the URL and anon/publishable key ship in the
 * browser bundle and are protected by Row Level Security. They are declared as
 * literals here (not only via env) so the bundler inlines them into every
 * runtime, including Edge middleware where committed `.env` files are not
 * reliably available on some platforms.
 *
 * An env var still wins when set (local dev via .env.local, or a per-client
 * deployment), so rebranding to another Supabase project needs only env vars —
 * or a change to the two fallbacks below.
 *
 * NEVER put the service-role key or any Stripe secret here — those are
 * server-only secrets and belong in the deployment's environment variables.
 */

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "https://edlhmlwsjcawramjxpuu.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "sb_publishable_2OoAIxEQoHAdAOOjL4q6AQ_RwSHiQkn";
