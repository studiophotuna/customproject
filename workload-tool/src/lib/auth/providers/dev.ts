import { ConfigurationError } from "@/lib/auth/errors";
import type { IdentityProvider, RawPrincipal } from "@/lib/auth/types";

// Dev mode. LOCAL ONLY — refuses to load when NODE_ENV is production.
// -----------------------------------------------------------------------------
// The identity comes from DEV_UPN/DEV_GROUPS, overridable per-browser by the
// `wat_dev_upn` cookie so you can click through all four roles without a
// restart (see the identity switcher in the header). Seeded agents are matched
// by upn, so switching to a seeded agent's upn gives you that agent's queue.

export const DEV_COOKIE = "wat_dev_upn";

/** Cookie parsing is done off the raw header so this file stays request-agnostic. */
function readCookie(headers: Headers, name: string): string | null {
  const cookie = headers.get("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export const devProvider: IdentityProvider = {
  mode: "dev",
  async resolve(headers) {
    if (process.env.NODE_ENV === "production") {
      throw new ConfigurationError(
        "AUTH_MODE is not set, so it defaulted to `dev`, which will not run in " +
          "a production build. Set AUTH_MODE=iis for the on-prem deployment " +
          "behind Windows auth, or AUTH_MODE=demo for a public demo with no " +
          "authentication."
      );
    }

    const upn = (
      readCookie(headers, DEV_COOKIE) ??
      process.env.DEV_UPN ??
      "admin@contoso.local"
    ).toLowerCase();

    // A cookie-supplied identity carries no groups of its own; the role then
    // comes from that agent's Agent.role row, which is what dev clickthrough
    // wants. The env identity keeps its configured groups.
    const fromCookie = readCookie(headers, DEV_COOKIE) !== null;
    const groups = fromCookie
      ? []
      : (process.env.DEV_GROUPS ?? "")
          .split(",")
          .map((g) => g.trim())
          .filter(Boolean);

    return {
      upn,
      displayName: fromCookie ? upn : process.env.DEV_DISPLAY_NAME ?? upn,
      groups,
    } satisfies RawPrincipal;
  },
};
