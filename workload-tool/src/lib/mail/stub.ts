import type { InboundMessage, MailAdapter } from "@/lib/mail/adapter";

// Dev-only mail adapter. Returns nothing unless you hand it messages.
// -----------------------------------------------------------------------------
// `queue()` lets a dev or a test push a message in and watch it become a ticket
// through the same path a real adapter would use. No network, no credentials.

const pending = new Map<string, InboundMessage[]>();
const acknowledged = new Set<string>();

export const stubMailAdapter: MailAdapter = {
  platform: "STUB",

  async fetchUnprocessed(mailboxAddress, limit) {
    const queue = pending.get(mailboxAddress.toLowerCase()) ?? [];
    return queue
      .filter((m) => !acknowledged.has(m.externalRef))
      .sort((a, b) => a.receivedAt.getTime() - b.receivedAt.getTime())
      .slice(0, limit);
  },

  async acknowledge(_mailboxAddress, externalRef) {
    acknowledged.add(externalRef);
  },
};

/** Test/dev helper: enqueue a message for the stub to hand back. */
export function queue(mailboxAddress: string, message: InboundMessage): void {
  const key = mailboxAddress.toLowerCase();
  pending.set(key, [...(pending.get(key) ?? []), message]);
}

/**
 * Swap point. MAIL_ADAPTER selects the implementation; everything except
 * `stub` is intentionally unbuilt until the Exchange/Graph decision is made,
 * and throws rather than pretending to work.
 */
export function getMailAdapter(): MailAdapter {
  const configured = (process.env.MAIL_ADAPTER ?? "stub").toLowerCase();
  if (configured === "stub") return stubMailAdapter;
  throw new Error(
    `MAIL_ADAPTER="${configured}" is not implemented. Only "stub" exists until ` +
      "the on-prem Exchange (EWS/IMAP) vs M365 Graph decision is made; " +
      "implement MailAdapter in src/lib/mail/ and register it here."
  );
}
