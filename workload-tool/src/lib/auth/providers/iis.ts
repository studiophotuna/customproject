import type { IdentityProvider, RawPrincipal } from "@/lib/auth/types";

// Windows Integrated Auth behind IIS.
// -----------------------------------------------------------------------------
// IIS performs Negotiate/NTLM before Node ever sees the request, then forwards
// the authenticated identity in a header. Which header depends on the bridge:
//   * iisnode      -> x-iisnode-logon_user  (DOMAIN\sam) and x-iisnode-auth_user
//   * ARR / rewrite -> X-Forwarded-User, or a custom server variable
// Both are read here so either hosting arrangement works unchanged.
//
// SECURITY: these headers are only trustworthy because IIS strips and re-sets
// them on the way in. The Node process must NOT be reachable directly — bind it
// to 127.0.0.1 and let IIS be the only listener on the public interface.
// Anonymous authentication must be disabled on the site.

const LOGON_HEADERS = [
  "x-iisnode-logon_user",
  "x-iisnode-auth_user",
  "x-forwarded-user",
  "remote-user",
];

/**
 * Groups are not carried on the wire by Windows auth. In production this is
 * where a read of the user's token groups belongs (an LDAP/AD lookup against a
 * domain controller, cached). Until that is wired, group membership comes from
 * the Agent row's role, which the DB owns.
 */
const GROUP_HEADER = "x-iisnode-token_groups";

/** DOMAIN\sam -> sam@domain.local when the header is not already a UPN. */
function normalizeUpn(raw: string, domainSuffix: string): string {
  const value = raw.trim();
  if (value.includes("@")) return value.toLowerCase();
  const [, sam] = value.split("\\");
  return `${(sam ?? value).toLowerCase()}@${domainSuffix}`;
}

export const iisProvider: IdentityProvider = {
  mode: "iis",
  async resolve(headers) {
    let logon: string | null = null;
    for (const name of LOGON_HEADERS) {
      const value = headers.get(name);
      if (value) {
        logon = value;
        break;
      }
    }
    if (!logon) return null;

    const domainSuffix = process.env.AD_DOMAIN_SUFFIX ?? "local";
    const upn = normalizeUpn(logon, domainSuffix);
    const groups = (headers.get(GROUP_HEADER) ?? "")
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean);

    const principal: RawPrincipal = {
      upn,
      displayName: headers.get("x-iisnode-display_name") ?? upn,
      groups,
    };
    return principal;
  },
};
