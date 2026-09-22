"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

import { DEV_COOKIE, authMode } from "@/lib/auth";

/**
 * Switch the dev-mode identity for this browser.
 *
 * Refuses outside dev mode. This is a Server Action, which means it is a public
 * POST endpoint whether or not the UI renders the switcher — so the mode check
 * lives here, not in the component that renders the form.
 */
export async function switchDevIdentity(formData: FormData): Promise<void> {
  if (authMode() !== "dev") {
    throw new Error("Identity switching is only available in AUTH_MODE=dev.");
  }

  const upn = String(formData.get("upn") ?? "").trim().toLowerCase();
  if (!upn) return;

  const jar = await cookies();
  jar.set(DEV_COOKIE, upn, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // Dev only; no Secure flag so it works over plain http on localhost.
  });

  revalidatePath("/", "layout");
}
