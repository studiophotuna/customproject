import { ROLES, type Role, isRole } from "@/lib/domain/constants";

// AD group -> application role.
// -----------------------------------------------------------------------------
// One mapping shared by every auth mode, so dev behaves like prod. Evaluated
// most-privileged-first: a user in both WAT-Managers and WAT-Members is a
// MANAGER. Group names are compared case-insensitively because AD is.

const ENV_KEYS: Record<Role, string> = {
  ADMIN: "AD_GROUP_ADMIN",
  MANAGER: "AD_GROUP_MANAGER",
  LEADER: "AD_GROUP_LEADER",
  MEMBER: "AD_GROUP_MEMBER",
};

function groupsFor(role: Role): string[] {
  return (process.env[ENV_KEYS[role]] ?? "")
    .split(",")
    .map((g) => g.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Derive the role from AD group membership. Returns null when no group matches,
 * which lets the caller fall back to the Agent row (the DB is authoritative for
 * users whose groups aren't carried on the wire, e.g. Windows auth without a
 * token-groups lookup).
 */
export function roleFromGroups(groups: string[]): Role | null {
  if (groups.length === 0) return null;
  const held = new Set(groups.map((g) => g.toLowerCase()));
  for (const role of ROLES) {
    if (groupsFor(role).some((g) => held.has(g))) return role;
  }
  return null;
}

/** Narrow a role string read out of the database. */
export function roleFromAgent(value: string | null | undefined): Role | null {
  return value && isRole(value) ? value : null;
}
