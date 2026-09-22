"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { DEMO_COOKIE, DEV_COOKIE, authMode } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

/**
 * Choose which seeded identity to act as.
 *
 * Only valid in the two modes that have no real authentication. Under iis or
 * entra the identity comes from the request and this is refused outright — a
 * Server Action is a public POST endpoint, so the check belongs here rather
 * than in whatever renders the picker.
 */
export async function chooseIdentity(formData: FormData): Promise<void> {
  const mode = authMode();
  if (mode !== "demo" && mode !== "dev") {
    throw new Error("Identity selection is not available under this auth mode.");
  }

  const upn = String(formData.get("upn") ?? "").trim().toLowerCase();
  if (!upn) return;

  // Only ever accept a upn that exists as an active agent; never trust the post.
  const agent = await prisma.agent.findUnique({
    where: { adUpn: upn },
    select: { id: true, active: true },
  });
  if (!agent?.active) throw new Error("Unknown or inactive user.");

  const jar = await cookies();
  jar.set(mode === "demo" ? DEMO_COOKIE : DEV_COOKIE, upn, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 12,
  });

  redirect("/my-work");
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
  jar.delete(DEV_COOKIE);
  redirect("/signin");
}
