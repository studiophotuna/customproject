import type { IdentityProvider, RawPrincipal } from "@/lib/auth/types";

// Demo mode — the only mode that is allowed to run on a public URL.
// -----------------------------------------------------------------------------
// There is NO authentication here. Anyone who can reach the site picks a seeded
// identity from a list and acts as them. That is deliberate and is why:
//
//   * every screen carries a visible DEMO marker,
//   * the data is seeded fiction, and
//   * real work requests, real staff names and anything confidential must never
//     be loaded into a deployment running this mode.
//
// Production on-prem uses AUTH_MODE=iis, where Windows/IIS authenticates the
// user before Node sees the request. Swapping modes is the only change needed.

export const DEMO_COOKIE = "wat_demo_upn";

function readCookie(headers: Headers, name: string): string | null {
  const cookie = headers.get("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export const demoProvider: IdentityProvider = {
  mode: "demo",
  async resolve(headers) {
    const upn = readCookie(headers, DEMO_COOKIE);
    // No cookie means nobody has chosen yet — the app sends them to /signin.
    if (!upn) return null;

    return {
      upn: upn.toLowerCase(),
      displayName: upn,
      // No groups: the role comes from the seeded Agent row, so the picker
      // shows exactly the role you get.
      groups: [],
    } satisfies RawPrincipal;
  },
};
