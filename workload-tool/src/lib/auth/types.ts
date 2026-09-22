import type { Role } from "@/lib/domain/constants";

/** What an identity provider must produce, whatever the auth mode. */
export interface RawPrincipal {
  /** AD userPrincipalName — the join key to Agent.adUpn. */
  upn: string;
  displayName: string;
  /** AD group names (or SIDs/object ids); role is derived from these. */
  groups: string[];
}

/** A resolved caller: principal + application role + the Agent row, if any. */
export interface Identity extends RawPrincipal {
  role: Role;
  /** Null when the AD user has no Agent row yet (can view, cannot be assigned). */
  agentId: string | null;
}

export interface IdentityProvider {
  readonly mode: "iis" | "entra" | "dev";
  /**
   * Resolve the caller from the incoming request headers. Implementations must
   * not perform network calls on the request path — group membership arrives in
   * the request (IIS token, Entra principal header) or from configuration.
   */
  resolve(headers: Headers): Promise<RawPrincipal | null>;
}
