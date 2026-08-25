import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runInstagramSync } from "@/lib/admin/instagram-sync";

/**
 * Scheduled Instagram sync (called by Vercel Cron; see vercel.json).
 * Runs with the service role so it works without a user session. Protected by
 * CRON_SECRET: Vercel sends `Authorization: Bearer <CRON_SECRET>` on cron runs;
 * a manual call may pass `?secret=<CRON_SECRET>`.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    const qp = req.nextUrl.searchParams.get("secret");
    if (auth !== `Bearer ${secret}` && qp !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Automated sync needs SUPABASE_SERVICE_ROLE_KEY set." },
      { status: 503 },
    );
  }

  try {
    const admin = createAdminClient();
    const { count } = await runInstagramSync(admin, { refresh: true });
    return NextResponse.json({ ok: true, count });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
