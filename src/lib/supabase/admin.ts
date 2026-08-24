import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

/**
 * Service-role Supabase client. Bypasses RLS — use ONLY in trusted server code
 * (Stripe webhooks, privileged admin tasks). Never import this into anything
 * that reaches the browser. Requires SUPABASE_SERVICE_ROLE_KEY.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set — required for admin/service operations.",
    );
  }
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
