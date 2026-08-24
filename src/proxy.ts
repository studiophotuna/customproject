import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js "proxy" convention (formerly "middleware"): runs before routes render.
// Here it refreshes the Supabase session and guards the /admin area.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Run on all routes except static assets and images.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
