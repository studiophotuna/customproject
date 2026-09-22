import type { CandidateAgent } from "@/lib/allocation/allocation-engine";
import { ALLOCATABLE_ROLES, OPEN_STATUSES } from "@/lib/domain/constants";
import { prisma } from "@/lib/db/prisma";
import { getScheduler } from "@/lib/scheduler/stub";

// Availability resolution — the impure half of allocation.
// -----------------------------------------------------------------------------
// Everything the engine needs to judge an agent is assembled here and handed
// over as plain objects. The engine never sees Prisma, a Date "now" it did not
// receive, or the scheduler.

export interface ResolvedCandidate extends CandidateAgent {
  adUpn: string;
  displayName: string;
}

/**
 * Build the candidate pool as of `at`.
 *
 * on shift        -> a Shift row covering `at`
 * not on leave/WFH -> the leave/WFH scheduler says they are not blocked
 * under cap       -> open tickets (ASSIGNED/IN_PROGRESS/ON_HOLD) < concurrentCap
 *
 * Inactive agents and non-allocatable roles (ADMIN/MANAGER) are excluded before
 * they ever reach the engine.
 */
export async function resolveCandidates(at: Date): Promise<ResolvedCandidate[]> {
  const agents = await prisma.agent.findMany({
    where: {
      active: true,
      role: { in: [...ALLOCATABLE_ROLES] },
    },
    select: {
      id: true,
      adUpn: true,
      displayName: true,
      concurrentCap: true,
      shifts: {
        where: { startsAt: { lte: at }, endsAt: { gt: at } },
        select: { id: true },
        take: 1,
      },
      _count: {
        select: {
          currentTickets: { where: { status: { in: [...OPEN_STATUSES] } } },
        },
      },
    },
    orderBy: { displayName: "asc" },
  });

  const blocked = await getScheduler().blockedUpns(
    at,
    agents.map((a) => a.adUpn)
  );

  return agents.map((agent) => ({
    id: agent.id,
    adUpn: agent.adUpn,
    displayName: agent.displayName,
    onShiftNow: agent.shifts.length > 0,
    onLeaveOrWfhBlocked: blocked.has(agent.adUpn.toLowerCase()),
    openTicketCount: agent._count.currentTickets,
    concurrentCap: agent.concurrentCap,
  }));
}

/** Open-ticket count for one agent — used by manual override to warn on cap. */
export async function openTicketCount(agentId: string): Promise<number> {
  return prisma.ticket.count({
    where: { currentAssigneeId: agentId, status: { in: [...OPEN_STATUSES] } },
  });
}
