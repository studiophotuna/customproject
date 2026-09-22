import type { IdentityProvider, RawPrincipal } from "@/lib/auth/types";

// Entra ID.
// -----------------------------------------------------------------------------
// Reads the client principal that the fronting proxy (App Proxy / Easy Auth /
// an internal APIM) injects after it has already validated the token. This
// provider does NOT call out to Entra itself — no outbound calls happen on the
// request path, which keeps the on-prem posture intact.
//
// NOT PRODUCTION-COMPLETE: if the deployment ever terminates tokens in this
// process instead of at a proxy, JWT signature/issuer/audience validation has
// to be added here first. Left explicit rather than silently half-done.

const PRINCIPAL_HEADER = "x-ms-client-principal";
const NAME_HEADER = "x-ms-client-principal-name";

interface ClientPrincipalClaim {
  typ: string;
  val: string;
}

interface ClientPrincipal {
  claims?: ClientPrincipalClaim[];
  userId?: string;
  userDetails?: string;
  userRoles?: string[];
}

const GROUP_CLAIM_TYPES = new Set([
  "groups",
  "roles",
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role",
]);

const UPN_CLAIM_TYPES = [
  "preferred_username",
  "upn",
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/upn",
];

export const entraProvider: IdentityProvider = {
  mode: "entra",
  async resolve(headers) {
    const encoded = headers.get(PRINCIPAL_HEADER);
    if (!encoded) return null;

    let principal: ClientPrincipal;
    try {
      principal = JSON.parse(
        Buffer.from(encoded, "base64").toString("utf8")
      ) as ClientPrincipal;
    } catch {
      return null;
    }

    const claims = principal.claims ?? [];
    const claim = (types: string[]) =>
      claims.find((c) => types.includes(c.typ))?.val;

    const upn =
      claim(UPN_CLAIM_TYPES) ??
      principal.userDetails ??
      headers.get(NAME_HEADER);
    if (!upn) return null;

    const groups = [
      ...claims.filter((c) => GROUP_CLAIM_TYPES.has(c.typ)).map((c) => c.val),
      ...(principal.userRoles ?? []),
    ];

    return {
      upn: upn.toLowerCase(),
      displayName: claim(["name"]) ?? principal.userDetails ?? upn,
      groups,
    } satisfies RawPrincipal;
  },
};
