import { prisma } from "@/lib/db/prisma";
import { getMailAdapter } from "@/lib/mail/stub";
import { createTicket } from "@/lib/db/tickets";
import { SYSTEM_ACTOR } from "@/lib/domain/constants";

// Mail ingestion step.
// -----------------------------------------------------------------------------
// Wired end to end against the MailAdapter interface, but the only registered
// adapter is the dev stub, so in practice this returns 0 until the Exchange vs
// Graph decision lands. The point is that when a real adapter is written,
// nothing here changes.

const BATCH = 25;

/** Map an inbound message to a ticket type using the mailbox's rules. */
function matchTicketType(
  rules: {
    matchKind: string;
    matchValue: string;
    ticketType: string;
    ruleOrder: number;
  }[],
  message: { from: string; to: string[]; subject: string }
): string | null {
  // Evaluated in ruleOrder; first match wins.
  for (const rule of [...rules].sort((a, b) => a.ruleOrder - b.ruleOrder)) {
    const value = rule.matchValue.toLowerCase();
    switch (rule.matchKind) {
      case "SENDER_DOMAIN":
        if (message.from.toLowerCase().endsWith(`@${value}`)) return rule.ticketType;
        break;
      case "SUBJECT_KEYWORD":
        if (message.subject.toLowerCase().includes(value)) return rule.ticketType;
        break;
      case "TO_ADDRESS":
        if (message.to.some((t) => t.toLowerCase() === value)) return rule.ticketType;
        break;
    }
  }
  return null;
}

/** Poll every active mailbox; returns how many tickets were created. */
export async function ingestMailbox(): Promise<number> {
  const mailboxes = await prisma.mailboxConfig.findMany({
    where: { active: true },
    include: { rules: true },
  });
  if (mailboxes.length === 0) return 0;

  const adapter = getMailAdapter();
  let created = 0;

  for (const mailbox of mailboxes) {
    const messages = await adapter.fetchUnprocessed(mailbox.address, BATCH);

    for (const message of messages) {
      const ticketType = matchTicketType(mailbox.rules, message);
      if (!ticketType) continue; // no rule matched; leave it for a human

      await createTicket({
        source: "EMAIL",
        externalRef: message.externalRef,
        subject: message.subject,
        body: message.body,
        ticketType,
        receivedAt: message.receivedAt,
        actor: SYSTEM_ACTOR,
      });
      created++;

      // Acknowledge only after the row is committed: a crash re-delivers
      // rather than silently dropping the request.
      await adapter.acknowledge(mailbox.address, message.externalRef);
    }
  }

  return created;
}
