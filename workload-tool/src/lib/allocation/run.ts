import {
  ASSIGNMENT_POLICIES,
  DEFAULT_CONFIG,
  ORDERING_STRATEGIES,
  allocate,
  type AllocationConfig,
  type QueueTicket,
} from "@/lib/allocation/allocation-engine";
import { prisma } from "@/lib/db/prisma";
import { resolveCandidates, type ResolvedCandidate } from "@/lib/db/agents";
import { assignWithin } from "@/lib/tickets/assign";
import { PENDING_STATUSES, SYSTEM_ACTOR } from "@/lib/domain/constants";

// The allocation pass — everything impure that surrounds the pure engine.
// -----------------------------------------------------------------------------
//   read pending  ->  resolve availability  ->  allocate()  ->  persist + audit
//
// The engine is called with plain objects and returns a plain plan. It does not
// know that Prisma, the scheduler, or a clock exist, which is what keeps the
// two decision switches (ordering, policy) to one line each.

export interface AllocationRunResult {
  at: Date;
  pendingCount: number;
  candidateCount: number;
  availableCount: number;
  assigned: number;
  skipped: number;
  config: AllocationConfig;
  schedulerBlocked: string[];
}

/** Read the ordering/policy switches from env, falling back to the agreed defaults. */
export function configFromEnv(): AllocationConfig {
  const ordering = process.env.ALLOCATION_ORDERING ?? DEFAULT_CONFIG.ordering;
  const policy = process.env.ALLOCATION_POLICY ?? DEFAULT_CONFIG.policy;

  if (!(ordering in ORDERING_STRATEGIES)) {
    throw new Error(
      `ALLOCATION_ORDERING="${ordering}" is unknown. Valid: ${Object.keys(
        ORDERING_STRATEGIES
      ).join(", ")}`
    );
  }
  if (!(policy in ASSIGNMENT_POLICIES)) {
    throw new Error(
      `ALLOCATION_POLICY="${policy}" is unknown. Valid: ${Object.keys(
        ASSIGNMENT_POLICIES
      ).join(", ")}`
    );
  }

  return {
    ordering: ordering as AllocationConfig["ordering"],
    policy: policy as AllocationConfig["policy"],
  };
}

/**
 * One allocation pass.
 *
 * Tickets nobody can take are simply left in the queue — that is also how shift
 * handover works: an unresolved ticket keeps its receivedAt, so it keeps its
 * FIFO position and its SLA clock, and is reconsidered next pass.
 */
export async function runAllocationPass(
  config: AllocationConfig = configFromEnv(),
  at: Date = new Date()
): Promise<AllocationRunResult> {
  const pendingRows = await prisma.ticket.findMany({
    where: { status: { in: [...PENDING_STATUSES] }, currentAssigneeId: null },
    select: { id: true, receivedAt: true, dueAt: true },
  });

  const pending: QueueTicket[] = pendingRows.map((t) => ({
    id: t.id,
    receivedAt: t.receivedAt,
    dueAt: t.dueAt,
  }));

  const candidates = await resolveCandidates(at);
  const plan = allocate(pending, candidates, config);

  let assigned = 0;
  let skipped = 0;

  for (const planned of plan) {
    // Re-check inside the transaction: a leader may have grabbed this ticket
    // between the read and the write. The plan is advisory, the row is truth.
    const persisted = await prisma.$transaction(async (tx) => {
      const current = await tx.ticket.findUnique({
        where: { id: planned.ticketId },
        select: { status: true, currentAssigneeId: true },
      });
      if (!current) return false;
      if (current.status !== "NEW" || current.currentAssigneeId !== null) {
        return false;
      }

      await assignWithin(tx, {
        ticketId: planned.ticketId,
        agentId: planned.agentId,
        actor: SYSTEM_ACTOR,
        reason: "AUTO",
        note: `auto-allocated (${config.ordering}/${config.policy})`,
      });
      return true;
    });

    if (persisted) assigned++;
    else skipped++;
  }

  return {
    at,
    pendingCount: pending.length,
    candidateCount: candidates.length,
    availableCount: countAvailable(candidates),
    assigned,
    skipped,
    config,
    schedulerBlocked: candidates
      .filter((c) => c.onLeaveOrWfhBlocked)
      .map((c) => c.adUpn),
  };
}

function countAvailable(candidates: ResolvedCandidate[]): number {
  return candidates.filter(
    (c) =>
      c.onShiftNow &&
      !c.onLeaveOrWfhBlocked &&
      c.openTicketCount < c.concurrentCap
  ).length;
}
