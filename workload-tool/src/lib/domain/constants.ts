// Domain vocabularies.
// -----------------------------------------------------------------------------
// The SQL Server connector has no Prisma enums, so schema.prisma documents the
// allowed values in comments and the app layer enforces them. This file is that
// enforcement point: every string written into a status/role/reason/event column
// comes from here, so the schema comments and the code cannot drift apart.

export const ROLES = ["ADMIN", "MANAGER", "LEADER", "MEMBER"] as const;
export type Role = (typeof ROLES)[number];

// Most privileged first. Used for "has at least this role" checks.
export const ROLE_RANK: Record<Role, number> = {
  ADMIN: 4,
  MANAGER: 3,
  LEADER: 2,
  MEMBER: 1,
};

/** Roles that auto-allocation is allowed to hand tickets to. */
export const ALLOCATABLE_ROLES: readonly Role[] = ["LEADER", "MEMBER"];

export const TICKET_STATUSES = [
  "NEW",
  "ASSIGNED",
  "IN_PROGRESS",
  "ON_HOLD",
  "RESOLVED",
  "CLOSED",
] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];

/** Statuses that occupy an agent's concurrent capacity. */
export const OPEN_STATUSES: readonly TicketStatus[] = [
  "ASSIGNED",
  "IN_PROGRESS",
  "ON_HOLD",
];

/** Statuses the allocator may pick up. */
export const PENDING_STATUSES: readonly TicketStatus[] = ["NEW"];

/**
 * Effort indicator on a ticket.
 *
 * Captured for reporting and internal productivity analysis. It MUST NOT reach
 * the allocator: the queue is ordered by SLA due time with arrival breaking
 * ties, and letting complexity influence that would let simple work overtake
 * complex work of equal urgency. `check:core` asserts the engine's inputs carry
 * no complexity field, so this cannot drift.
 */
export const COMPLEXITIES = ["LOW", "MEDIUM", "HIGH"] as const;
export type Complexity = (typeof COMPLEXITIES)[number];

/** Relative effort weights, for productivity reporting only — never allocation. */
export const COMPLEXITY_WEIGHT: Record<Complexity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

export function isComplexity(value: string): value is Complexity {
  return (COMPLEXITIES as readonly string[]).includes(value);
}

export const TICKET_SOURCES = ["EMAIL", "MANUAL"] as const;
export type TicketSource = (typeof TICKET_SOURCES)[number];

export const ASSIGNMENT_REASONS = [
  "AUTO",
  "MANUAL_OVERRIDE",
  "HANDOVER",
  "REASSIGN",
] as const;
export type AssignmentReason = (typeof ASSIGNMENT_REASONS)[number];

export const AUDIT_EVENTS = [
  "CREATED",
  "ASSIGNED",
  "REASSIGNED",
  "UNASSIGNED",
  "STARTED",
  "HELD",
  "RESUMED",
  "RESOLVED",
  "REOPENED",
  "CLOSED",
  "OVERRIDE",
] as const;
export type AuditEvent = (typeof AUDIT_EVENTS)[number];

/** The literal actor recorded for anything the worker does unattended. */
export const SYSTEM_ACTOR = "SYSTEM";

// --- Lifecycle state machine -------------------------------------------------
// NEW -> ASSIGNED -> IN_PROGRESS -> ON_HOLD -> RESOLVED -> CLOSED, plus the
// backwards edges real work needs (unassign, resume, reopen). Anything not
// listed here is rejected before it reaches the database.
export const TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  NEW: ["ASSIGNED"],
  ASSIGNED: ["IN_PROGRESS", "ON_HOLD", "RESOLVED", "NEW"],
  IN_PROGRESS: ["ON_HOLD", "RESOLVED", "ASSIGNED"],
  ON_HOLD: ["IN_PROGRESS", "ASSIGNED", "RESOLVED"],
  RESOLVED: ["CLOSED", "IN_PROGRESS"],
  CLOSED: [],
};

/** The audit event that records a given transition. */
export const TRANSITION_EVENT: Record<string, AuditEvent> = {
  "NEW->ASSIGNED": "ASSIGNED",
  "ASSIGNED->IN_PROGRESS": "STARTED",
  "ASSIGNED->ON_HOLD": "HELD",
  "ASSIGNED->RESOLVED": "RESOLVED",
  "ASSIGNED->NEW": "UNASSIGNED",
  "IN_PROGRESS->ON_HOLD": "HELD",
  "IN_PROGRESS->RESOLVED": "RESOLVED",
  "IN_PROGRESS->ASSIGNED": "UNASSIGNED",
  "ON_HOLD->IN_PROGRESS": "RESUMED",
  "ON_HOLD->ASSIGNED": "RESUMED",
  "ON_HOLD->RESOLVED": "RESOLVED",
  "RESOLVED->CLOSED": "CLOSED",
  "RESOLVED->IN_PROGRESS": "REOPENED",
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

export function isTicketStatus(value: string): value is TicketStatus {
  return (TICKET_STATUSES as readonly string[]).includes(value);
}

export function hasAtLeast(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}
