import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";

/**
 * Supabase client for Server Components, Route Handlers, and Server Actions.
 * Reads/writes the auth session from cookies. The cookie write can throw when
 * called from a Server Component (read-only context) — that's expected and safe
 * to ignore, since middleware refreshes the session.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Called from a Server Component — ignore; middleware handles refresh.
          }
        },
      },
    },
  );
}
