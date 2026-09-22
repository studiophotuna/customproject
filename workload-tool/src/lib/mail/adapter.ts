// Mail ingestion — adapter interface.
// -----------------------------------------------------------------------------
// The platform decision (on-prem Exchange via EWS/IMAP vs M365 Graph) is open,
// so NO real adapter is implemented here. This interface is the contract a real
// one must satisfy, and `stub.ts` is the only implementation today.
//
// Deliberately narrow: fetch, then acknowledge. Threading and de-duplication
// ride on `externalRef` (Ticket.externalRef is unique), so an adapter that
// redelivers a message cannot create a second ticket.

export interface InboundMessage {
  /** Conversation/message id from the source. Becomes Ticket.externalRef. */
  externalRef: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  /** When the mail server received it — this starts the SLA clock. */
  receivedAt: Date;
}

export interface MailAdapter {
  readonly platform: "STUB" | "EXCHANGE_ONPREM" | "M365_GRAPH" | "IMAP";
  /** Messages not yet ingested, oldest first. */
  fetchUnprocessed(mailboxAddress: string, limit: number): Promise<InboundMessage[]>;
  /**
   * Mark a message handled at the source (flag/move/mark-read). Called only
   * after the ticket row is committed, so a crash re-delivers rather than
   * silently dropping work.
   */
  acknowledge(mailboxAddress: string, externalRef: string): Promise<void>;
}
