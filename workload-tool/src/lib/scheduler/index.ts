// Leave / WFH scheduler — availability source.
// -----------------------------------------------------------------------------
// The real source is the existing leave/WFH scheduler's tables (same SQL Server
// instance), most likely read through a VIEW so availability lives in one
// place. Until that view exists this is a stub, behind an interface so the swap
// is a one-line change in `getScheduler()`.
//
// Contract: given a moment and a set of AD upns, say which of them must NOT be
// given new work. "WFH" is only blocking if the org treats it as such — that
// policy lives in the source, not in the allocator.

export interface AvailabilityException {
  adUpn: string;
  from: Date;
  to: Date;
  kind: "LEAVE" | "WFH" | "TRAINING" | "OTHER";
  /** False for a WFH day that still takes tickets. */
  blocksAllocation: boolean;
  note?: string;
}

export interface LeaveWfhScheduler {
  readonly name: string;
  /** Upns that are blocked from new allocation at `at`. */
  blockedUpns(at: Date, candidates: string[]): Promise<Set<string>>;
  /** Everything on the calendar in a window — for the UI, not the allocator. */
  exceptions(from: Date, to: Date): Promise<AvailabilityException[]>;
}
