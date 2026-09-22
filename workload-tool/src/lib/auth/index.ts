import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ConfigurationError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db/prisma";
import { hasAtLeast, type Role } from "@/lib/domain/constants";
import { roleFromAgent, roleFromGroups } from "@/lib/auth/roles";
import { demoProvider } from "@/lib/auth/providers/demo";
import { devProvider } from "@/lib/auth/providers/dev";
import { entraProvider } from "@/lib/auth/providers/entra";
import { iisProvider } from "@/lib/auth/providers/iis";
import type { Identity, IdentityProvider } from "@/lib/auth/types";

export type { Identity } from "@/lib/auth/types";
export { DEV_COOKIE } from "@/lib/auth/providers/dev";
export { DEMO_COOKIE } from "@/lib/auth/providers/demo";

const PROVIDERS: Record<string, IdentityProvider> = {
  iis: iisProvider,
  entra: entraProvider,
  dev: devProvider,
  demo: demoProvider,
};

export type AuthMode = "iis" | "entra" | "dev" | "demo";

export function authMode(): AuthMode {
  const mode = (process.env.AUTH_MODE ?? "dev").toLowerCase();
  if (mode in PROVIDERS) return mode as AuthMode;
  throw new ConfigurationError(
    `Unknown AUTH_MODE "${mode}". Expected one of: iis, entra, dev, demo.`
  );
}

/** True when the app is running with no real authentication. */
export function isOpenDemo(): boolean {
  return authMode() === "demo";
}

/**
 * The caller for this request, or null if unauthenticated.
 *
 * Role resolution order: AD groups first (the intended production path), then
 * the Agent row as the fallback. Windows auth does not carry group membership
 * on the wire, so without the fallback every IIS user would be unauthenticated
 * until a token-groups lookup is wired up.
 */
export async function getIdentity(): Promise<Identity | null> {
  const provider = PROVIDERS[authMode()];
  const principal = await provider.resolve(await headers());
  if (!principal) return null;

  const agent = await prisma.agent.findUnique({
    where: { adUpn: principal.upn },
    select: { id: true, role: true, displayName: true, active: true },
  });

  const role = roleFromGroups(principal.groups) ?? roleFromAgent(agent?.role);
  if (!role) return null;

  return {
    ...principal,
    displayName: agent?.displayName ?? principal.displayName,
    role,
    agentId: agent && agent.active ? agent.id : null,
  };
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * The caller, guaranteed to hold at least `minimum`.
 *
 * Someone reaching a page their role does not cover is an ordinary outcome, not
 * a fault, so it redirects to an explanatory page rather than throwing. Throwing
 * would surface as "Something went wrong" — React scrubs error messages out of
 * client error boundaries in production, so the real reason never reaches the
 * screen.
 *
 * Server Actions are public POST endpoints, so this is still the authorization
 * check for them; a redirect response is a refusal there too.
 */
export async function requireRole(minimum: Role): Promise<Identity> {
  const identity = await getIdentity();

  if (!identity) {
    const mode = authMode();
    if (mode === "demo" || mode === "dev") redirect("/signin");
    throw new AuthorizationError(
      "Not authenticated. Behind IIS, check that Anonymous Authentication is " +
        "disabled and Windows Authentication is enabled on the site."
    );
  }

  if (!hasAtLeast(identity.role, minimum)) {
    redirect(`/no-access?need=${encodeURIComponent(minimum)}`);
  }

  return identity;
}

/** Non-throwing variant for conditional UI. */
export function can(identity: Identity | null, minimum: Role): boolean {
  return identity !== null && hasAtLeast(identity.role, minimum);
}
