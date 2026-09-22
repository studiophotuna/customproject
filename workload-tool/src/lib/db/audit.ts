import type { Prisma } from "@prisma/client";

import type { AuditEvent } from "@/lib/domain/constants";

/** Anything Prisma-ish we can write through: the client or a transaction. */
export type Db = Prisma.TransactionClient;

export interface AuditInput {
  ticketId: string | null;
  actor: string;
  event: AuditEvent;
  /** Serialized into detailsJson (NVarChar(Max) — SQL Server has no Json type). */
  details?: unknown;
}

/**
 * Append one immutable audit row. Always called inside the same transaction as
 * the change it records, so a ticket can never move without its trail.
 */
export async function writeAudit(db: Db, input: AuditInput): Promise<void> {
  await db.auditLog.create({
    data: {
      ticketId: input.ticketId,
      actor: input.actor,
      event: input.event,
      detailsJson:
        input.details === undefined ? null : JSON.stringify(input.details),
    },
  });
}
