// Workload Allocation Tool — allocation engine (core logic)
// -----------------------------------------------------------------------------
// Pure, framework-agnostic functions: no Prisma, no I/O, no dates-from-now.
// The data layer resolves availability (from the scheduler) and open-ticket
// counts, hands plain objects to `allocate`, and persists the returned plan.
// Keeping this pure makes the two open decisions trivial to flip and the whole
// thing unit-testable.
//
// TWO DECISION SWITCH POINTS, both isolated below:
//   1. Ordering rule .......... ORDERING_STRATEGIES (default: priorityBandedFifo)
//   2. Assignment policy ...... ASSIGNMENT_POLICIES  (default: leastLoaded)
// -----------------------------------------------------------------------------

export interface QueueTicket {
  id: string;
  receivedAt: Date; // starts the SLA clock; also the FIFO key
  dueAt: Date;      // receivedAt + SLA, hold time already folded in
}

export interface CandidateAgent {
  id: string;
  onShiftNow: boolean;   // resolved from shift data
  onLeaveOrWfhBlocked: boolean; // resolved from the leave/WFH scheduler
  openTicketCount: number;
  concurrentCap: number;
}

export interface AllocationConfig {
  ordering: keyof typeof ORDERING_STRATEGIES;
  policy: keyof typeof ASSIGNMENT_POLICIES;
}

export const DEFAULT_CONFIG: AllocationConfig = {
  ordering: "priorityBandedFifo",
  policy: "leastLoaded",
};

export interface PlannedAssignment {
  ticketId: string;
  agentId: string;
}

// --- SLA clock ---------------------------------------------------------------
// dueAt is computed once, at ticket creation, and stored. Calendar-hours is a
// simple add; business-hours must walk a shift/holiday calendar. Left as a hook
// so the business-hours implementation can be dropped in without touching the
// allocator. `businessHoursOnly` comes from the ticket's SlaRule.
export function computeDueAt(
  receivedAt: Date,
  slaMinutes: number,
  businessHoursOnly: boolean,
  addBusinessMinutes?: (from: Date, minutes: number) => Date
): Date {
  if (!businessHoursOnly) {
    return new Date(receivedAt.getTime() + slaMinutes * 60_000);
  }
  if (!addBusinessMinutes) {
    throw new Error(
      "businessHoursOnly ticket requires an addBusinessMinutes calendar function"
    );
  }
  return addBusinessMinutes(receivedAt, slaMinutes);
}

// --- (1) Ordering strategies -------------------------------------------------
// Each takes the pending queue and returns it in the order it should be worked.
type Ordering = (tickets: QueueTicket[]) => QueueTicket[];

// RECOMMENDED. Order by due time; arrival time breaks ties within the same
// SLA band. True FIFO among equally urgent tickets, without avoidable breaches.
const priorityBandedFifo: Ordering = (tickets) =>
  [...tickets].sort(
    (a, b) =>
      a.dueAt.getTime() - b.dueAt.getTime() ||
      a.receivedAt.getTime() - b.receivedAt.getTime()
  );

// Pure arrival order. SLA becomes a reporting/alerting metric only.
const pureFifo: Ordering = (tickets) =>
  [...tickets].sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime());

// Nearest deadline always wins; arrival only breaks exact ties.
const strictSlaFirst: Ordering = (tickets) =>
  [...tickets].sort(
    (a, b) =>
      a.dueAt.getTime() - b.dueAt.getTime() ||
      a.receivedAt.getTime() - b.receivedAt.getTime()
  );

export const ORDERING_STRATEGIES = {
  priorityBandedFifo,
  pureFifo,
  strictSlaFirst,
} satisfies Record<string, Ordering>;

// --- Availability ------------------------------------------------------------
export function isAvailable(agent: CandidateAgent): boolean {
  return (
    agent.onShiftNow &&
    !agent.onLeaveOrWfhBlocked &&
    agent.openTicketCount < agent.concurrentCap
  );
}

// --- (2) Assignment policies -------------------------------------------------
// Pick the next agent from the currently-available pool. Returns null if none.
type Policy = (available: CandidateAgent[]) => CandidateAgent | null;

// RECOMMENDED for "regardless of complexity": give the next ticket to whoever
// holds the fewest open tickets; ties broken by id for determinism.
const leastLoaded: Policy = (available) =>
  available.length === 0
    ? null
    : [...available].sort(
        (a, b) =>
          a.openTicketCount - b.openTicketCount || a.id.localeCompare(b.id)
      )[0];

// Simple round-robin over a stable id order.
const roundRobin: Policy = (available) =>
  available.length === 0
    ? null
    : [...available].sort((a, b) => a.id.localeCompare(b.id))[0];

export const ASSIGNMENT_POLICIES = {
  leastLoaded,
  roundRobin,
} satisfies Record<string, Policy>;

// --- The allocation pass -----------------------------------------------------
// Order the queue, then walk it top-to-bottom handing each ticket to the best
// available agent, respecting concurrent caps. Load is tracked locally so a
// single pass can assign several tickets to distinct agents fairly. Tickets left
// over (everyone at cap) simply stay in the queue for the next pass — this is
// also exactly how shift handover works: unresolved tickets keep their
// receivedAt (hence FIFO position and SLA clock) and get re-considered next loop.
export function allocate(
  pending: QueueTicket[],
  agents: CandidateAgent[],
  config: AllocationConfig = DEFAULT_CONFIG
): PlannedAssignment[] {
  const order = ORDERING_STRATEGIES[config.ordering];
  const pick = ASSIGNMENT_POLICIES[config.policy];

  // Local, mutable view of load so we don't over-assign within one pass.
  const load = new Map(agents.map((a) => [a.id, a.openTicketCount]));
  const plan: PlannedAssignment[] = [];

  for (const ticket of order(pending)) {
    const available = agents.filter((a) =>
      isAvailable({ ...a, openTicketCount: load.get(a.id) ?? a.openTicketCount })
    );
    const agent = pick(available);
    if (!agent) continue; // no capacity right now; ticket waits for the next pass

    plan.push({ ticketId: ticket.id, agentId: agent.id });
    load.set(agent.id, (load.get(agent.id) ?? 0) + 1);
  }

  return plan;
}
