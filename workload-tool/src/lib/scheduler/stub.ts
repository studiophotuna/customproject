import { readFileSync } from "node:fs";
import { join } from "node:path";

import type {
  AvailabilityException,
  LeaveWfhScheduler,
} from "@/lib/scheduler/index";

// File-backed stub for the leave/WFH scheduler.
// -----------------------------------------------------------------------------
// Reads data/leave-wfh.stub.json so you can demo "agent is on leave, allocator
// skips them" without the real scheduler. Re-read on every call (no caching) so
// editing the file during a dev session takes effect immediately.

interface StubRow {
  adUpn: string;
  from: string;
  to: string;
  kind: AvailabilityException["kind"];
  blocksAllocation: boolean;
  note?: string;
}

const STUB_PATH = join(process.cwd(), "data", "leave-wfh.stub.json");

function load(): AvailabilityException[] {
  let raw: string;
  try {
    raw = readFileSync(STUB_PATH, "utf8");
  } catch {
    // No stub file is a valid state: nobody is on leave.
    return [];
  }
  const rows = JSON.parse(raw) as StubRow[];
  return rows.map((r) => ({
    adUpn: r.adUpn.toLowerCase(),
    from: new Date(r.from),
    to: new Date(r.to),
    kind: r.kind,
    blocksAllocation: r.blocksAllocation,
    note: r.note,
  }));
}

function covers(row: AvailabilityException, at: Date): boolean {
  return row.from.getTime() <= at.getTime() && at.getTime() < row.to.getTime();
}

export const stubScheduler: LeaveWfhScheduler = {
  name: "stub(file)",

  async blockedUpns(at, candidates) {
    const wanted = new Set(candidates.map((c) => c.toLowerCase()));
    const blocked = new Set<string>();
    for (const row of load()) {
      if (!row.blocksAllocation) continue;
      if (!wanted.has(row.adUpn)) continue;
      if (covers(row, at)) blocked.add(row.adUpn);
    }
    return blocked;
  },

  async exceptions(from, to) {
    return load().filter(
      (row) => row.from.getTime() < to.getTime() && row.to.getTime() > from.getTime()
    );
  },
};

/**
 * Swap point. When the scheduler view lands, add a `sqlScheduler` that queries
 * it and select on an env var here — nothing upstream changes.
 */
export function getScheduler(): LeaveWfhScheduler {
  return stubScheduler;
}
