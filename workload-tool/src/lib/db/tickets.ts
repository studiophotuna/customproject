import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/lib/db/audit";
import {
  type Complexity,
  OPEN_STATUSES,
  PENDING_STATUSES,
  type TicketSource,
  type TicketStatus,
} from "@/lib/domain/constants";
import { dueAtFor } from "@/lib/sla";

// Ticket reads and creation.
// -----------------------------------------------------------------------------
// Queue reads are ordered the same way the allocator orders its pass (dueAt,
// then receivedAt), so what a leader sees at the top of the queue is what the
// worker will pick up next.

export interface CreateTicketInput {
  source: TicketSource;
  /** Effort indicator. Reporting only — never reaches the allocator. */
  complexity?: Complexity;
  subject: string;
  body?: string | null;
  ticketType: string;
  receivedAt: Date;
  actor: string;
  /** Email conversation/message id. Unique — this is the de-dupe key. */
  externalRef?: string | null;
}

export class TicketCreationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TicketCreationError";
  }
}

/**
 * Create a ticket, stamping the SLA onto it.
 *
 * The SLA is SNAPSHOTTED (ticketType + dueAt) rather than FK'd, so editing the
 * SLA matrix later never moves the clock on tickets already in flight.
 */
export async function createTicket(input: CreateTicketInput) {
  const subject = input.subject.trim();
  if (!subject) throw new TicketCreationError("Subject is required.");

  const rule = await prisma.slaRule.findUnique({
    where: { ticketType: input.ticketType },
  });
  if (!rule || !rule.active) {
    throw new TicketCreationError(
      `No active SLA rule for ticket type "${input.ticketType}".`
    );
  }

  const dueAt = dueAtFor({
    receivedAt: input.receivedAt,
    slaMinutes: rule.slaMinutes,
    businessHoursOnly: rule.businessHoursOnly,
  });

  if (input.externalRef) {
    const existing = await prisma.ticket.findUnique({
      where: { externalRef: input.externalRef },
      select: { id: true },
    });
    // De-dupe rather than fail: a redelivered email is not an error.
    if (existing) return existing;
  }

  return prisma.$transaction(async (tx) => {
    const ticket = await tx.ticket.create({
      data: {
        source: input.source,
        externalRef: input.externalRef ?? null,
        subject,
        body: input.body?.trim() || null,
        ticketType: input.ticketType,
        complexity: input.complexity ?? "MEDIUM",
        receivedAt: input.receivedAt,
        dueAt,
        status: "NEW",
      },
      select: { id: true },
    });

    await writeAudit(tx, {
      ticketId: ticket.id,
      actor: input.actor,
      event: "CREATED",
      details: {
        source: input.source,
        ticketType: input.ticketType,
        receivedAt: input.receivedAt.toISOString(),
        dueAt: dueAt.toISOString(),
        slaMinutes: rule.slaMinutes,
        businessHoursOnly: rule.businessHoursOnly,
      },
    });

    return ticket;
  });
}

const QUEUE_SELECT = {
  id: true,
  subject: true,
  ticketType: true,
  complexity: true,
  source: true,
  status: true,
  receivedAt: true,
  dueAt: true,
  onHoldSince: true,
  holdAccumulatedMinutes: true,
  currentAssigneeId: true,
  currentAssignee: { select: { id: true, displayName: true, adUpn: true } },
} as const;

export type QueueRow = Awaited<ReturnType<typeof listQueue>>[number];

export interface QueueFilter {
  statuses?: TicketStatus[];
  assigneeId?: string;
  /** Only tickets with no current assignee. */
  unassignedOnly?: boolean;
  take?: number;
}

export async function listQueue(filter: QueueFilter = {}) {
  const statuses = filter.statuses?.length
    ? filter.statuses
    : ([...PENDING_STATUSES, ...OPEN_STATUSES] as TicketStatus[]);

  return prisma.ticket.findMany({
    where: {
      status: { in: statuses },
      ...(filter.assigneeId ? { currentAssigneeId: filter.assigneeId } : {}),
      ...(filter.unassignedOnly ? { currentAssigneeId: null } : {}),
    },
    select: QUEUE_SELECT,
    // Same key as the allocator's priority-banded FIFO ordering.
    orderBy: [{ dueAt: "asc" }, { receivedAt: "asc" }],
    take: filter.take ?? 200,
  });
}

export async function getTicket(id: string) {
  return prisma.ticket.findUnique({
    where: { id },
    select: {
      ...QUEUE_SELECT,
      body: true,
      holdReason: true,
      resolvedAt: true,
      closedAt: true,
      createdAt: true,
      assignments: {
        orderBy: { assignedAt: "desc" },
        select: {
          id: true,
          reason: true,
          assignedAt: true,
          unassignedAt: true,
          agent: { select: { displayName: true, adUpn: true } },
        },
      },
      events: {
        orderBy: { at: "desc" },
        take: 50,
        select: {
          id: true,
          actor: true,
          event: true,
          detailsJson: true,
          at: true,
        },
      },
    },
  });
}

export async function listSlaRules() {
  return prisma.slaRule.findMany({
    where: { active: true },
    orderBy: { ticketType: "asc" },
  });
}

/** Counts for the queue header. */
export async function queueCounts() {
  const rows = await prisma.ticket.groupBy({
    by: ["status"],
    _count: { _all: true },
  });
  const counts: Record<string, number> = {};
  for (const row of rows) counts[row.status] = row._count._all;
  return counts;
}
