// Core-logic checks that need no database.
// -----------------------------------------------------------------------------
//   npm run check:core
//
// Covers the parts that decide behaviour: the allocation engine's availability
// and policy rules, the SLA clock, the lifecycle state machine, and AD group ->
// role mapping. Anything that needs SQL Server is out of scope here by design.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  ORDERING_STRATEGIES,
  ASSIGNMENT_POLICIES,
  DEFAULT_CONFIG,
  allocate,
  isAvailable,
  computeDueAt,
  type CandidateAgent,
  type QueueTicket,
} from "../src/lib/allocation/allocation-engine";
import {
  TRANSITIONS,
  TRANSITION_EVENT,
  AUDIT_EVENTS,
  canTransition,
  hasAtLeast,
  type TicketStatus,
} from "../src/lib/domain/constants";
import { makeAddBusinessMinutes, dueAtAfterHold } from "../src/lib/sla";
import { roleFromGroups } from "../src/lib/auth/roles";

let checks = 0;
function check(name: string, fn: () => void): void {
  fn();
  checks++;
  console.log(`  ok  ${name}`);
}

const minute = 60_000;
const base = new Date("2026-09-21T09:00:00"); // a Monday, 09:00 local

function ticket(id: string, receivedOffsetMin: number, dueOffsetMin: number): QueueTicket {
  return {
    id,
    receivedAt: new Date(base.getTime() + receivedOffsetMin * minute),
    dueAt: new Date(base.getTime() + dueOffsetMin * minute),
  };
}

function agent(id: string, over: Partial<CandidateAgent> = {}): CandidateAgent {
  return {
    id,
    onShiftNow: true,
    onLeaveOrWfhBlocked: false,
    openTicketCount: 0,
    concurrentCap: 5,
    ...over,
  };
}

console.log("\nallocation engine");

check("default config is priority-banded FIFO + least-loaded", () => {
  assert.equal(DEFAULT_CONFIG.ordering, "priorityBandedFifo");
  assert.equal(DEFAULT_CONFIG.policy, "leastLoaded");
  assert.ok(DEFAULT_CONFIG.ordering in ORDERING_STRATEGIES);
  assert.ok(DEFAULT_CONFIG.policy in ASSIGNMENT_POLICIES);
});

check("unavailable agents are excluded for the documented reasons", () => {
  assert.equal(isAvailable(agent("ok")), true);
  assert.equal(isAvailable(agent("off", { onShiftNow: false })), false);
  assert.equal(isAvailable(agent("leave", { onLeaveOrWfhBlocked: true })), false);
  assert.equal(
    isAvailable(agent("cap", { openTicketCount: 5, concurrentCap: 5 })),
    false
  );
});

check("ordering is by due time, arrival breaking ties", () => {
  const pending = [
    ticket("late-arrival-urgent", 30, 60),
    ticket("early-arrival-relaxed", 0, 600),
    ticket("early-arrival-urgent", 5, 60),
  ];
  const ordered = ORDERING_STRATEGIES.priorityBandedFifo(pending).map((t) => t.id);
  assert.deepEqual(ordered, [
    "early-arrival-urgent", // same band as late-arrival-urgent, arrived first
    "late-arrival-urgent",
    "early-arrival-relaxed",
  ]);
});

check("a pass spreads work across agents and respects caps", () => {
  const pending = [
    ticket("t1", 0, 60),
    ticket("t2", 1, 120),
    ticket("t3", 2, 180),
    ticket("t4", 3, 240),
  ];
  const agents = [
    agent("busy", { openTicketCount: 2, concurrentCap: 3 }), // 1 slot
    agent("idle", { openTicketCount: 0, concurrentCap: 2 }), // 2 slots
    agent("off", { onShiftNow: false }),
    agent("leave", { onLeaveOrWfhBlocked: true }),
  ];

  const plan = allocate(pending, agents, DEFAULT_CONFIG);

  // Three slots across two agents; the fourth ticket waits for the next pass.
  assert.equal(plan.length, 3);
  assert.deepEqual(plan.map((p) => p.ticketId), ["t1", "t2", "t3"]);

  const perAgent = new Map<string, number>();
  for (const p of plan) perAgent.set(p.agentId, (perAgent.get(p.agentId) ?? 0) + 1);
  assert.equal(perAgent.get("idle"), 2);
  assert.equal(perAgent.get("busy"), 1);
  assert.equal(perAgent.has("off"), false);
  assert.equal(perAgent.has("leave"), false);
});

check("one pass levels load out instead of filling one agent to cap", () => {
  // Regression: leastLoaded must sort on the LIVE load tracked during the pass,
  // not the stale counts read from the database. Filtering the original agent
  // objects gave the emptiest agent every ticket until they hit their cap.
  const pending = Array.from({ length: 6 }, (_, i) => ticket(`t${i + 1}`, i, (i + 1) * 60));
  const agents = [
    agent("alice", { openTicketCount: 2, concurrentCap: 5 }),
    agent("bob", { openTicketCount: 2, concurrentCap: 3 }),
    agent("sam", { openTicketCount: 0, concurrentCap: 4 }),
  ];

  const tally: Record<string, number> = {};
  for (const p of allocate(pending, agents)) {
    tally[p.agentId] = (tally[p.agentId] ?? 0) + 1;
  }

  assert.deepEqual(tally, { sam: 3, alice: 2, bob: 1 });
  // Nobody is left idle while someone else is saturated.
  assert.ok(tally.bob > 0, "bob must receive work rather than being starved");
});

check("nothing is allocated when nobody is available", () => {
  const plan = allocate([ticket("t1", 0, 60)], [agent("off", { onShiftNow: false })]);
  assert.deepEqual(plan, []);
});

check("complexity never reaches the allocation engine", () => {
  // The guarantee the brief asks for: however complex a ticket is, it cannot
  // jump or lose its place. The engine's input type is the enforcement point —
  // if someone adds complexity to QueueTicket, this fails.
  const sample = ticket("t1", 0, 60);
  assert.deepEqual(
    Object.keys(sample).sort(),
    ["dueAt", "id", "receivedAt"],
    "QueueTicket must carry only id, receivedAt and dueAt"
  );

  // Strip comments first: the engine's own prose says it allocates "regardless
  // of complexity", which is the property being asserted, not a violation.
  const codeOnly = (file: string) =>
    readFileSync(
      join(import.meta.dirname, "..", "src", "lib", "allocation", file),
      "utf8"
    )
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/\/\/.*$/gm, "");

  for (const file of ["allocation-engine.ts", "run.ts"]) {
    assert.ok(
      !/complexity/i.test(codeOnly(file)),
      `${file} must not read complexity in code`
    );
  }
});

console.log("\nSLA clock");

check("calendar-hours SLA is a plain addition", () => {
  const due = computeDueAt(base, 90, false);
  assert.equal(due.getTime(), base.getTime() + 90 * minute);
});

check("business-hours SLA rolls over to the next working day", () => {
  const addBusiness = makeAddBusinessMinutes({
    days: [1, 2, 3, 4, 5],
    startMinutes: 9 * 60,
    endMinutes: 17 * 60,
  });
  // Monday 09:00 + 10 business hours = Tuesday 11:00 (8h Monday, 2h Tuesday).
  const due = computeDueAt(base, 600, true, addBusiness);
  assert.equal(due.getDate(), 22);
  assert.equal(due.getHours(), 11);
});

check("business-hours SLA skips the weekend", () => {
  const addBusiness = makeAddBusinessMinutes({
    days: [1, 2, 3, 4, 5],
    startMinutes: 9 * 60,
    endMinutes: 17 * 60,
  });
  const fridayAfternoon = new Date("2026-09-25T16:00:00"); // Friday 16:00
  const due = addBusiness(fridayAfternoon, 120); // 1h Friday + 1h Monday
  assert.equal(due.getDay(), 1, "lands on a Monday");
  assert.equal(due.getHours(), 10);
});

check("business-hours SLA requires a calendar function", () => {
  assert.throws(() => computeDueAt(base, 60, true), /addBusinessMinutes/);
});

check("time on hold pushes the due time out, it does not burn budget", () => {
  const due = new Date(base.getTime() + 120 * minute);
  assert.equal(
    dueAtAfterHold(due, 45, false).getTime(),
    due.getTime() + 45 * minute
  );
  assert.equal(dueAtAfterHold(due, 0, false).getTime(), due.getTime());
});

console.log("\nlifecycle");

check("the documented happy path is walkable end to end", () => {
  const path: TicketStatus[] = [
    "NEW",
    "ASSIGNED",
    "IN_PROGRESS",
    "ON_HOLD",
    "IN_PROGRESS",
    "RESOLVED",
    "CLOSED",
  ];
  for (let i = 0; i < path.length - 1; i++) {
    assert.ok(
      canTransition(path[i], path[i + 1]),
      `${path[i]} -> ${path[i + 1]} should be allowed`
    );
  }
});

check("illegal transitions are rejected", () => {
  assert.equal(canTransition("NEW", "RESOLVED"), false);
  assert.equal(canTransition("NEW", "CLOSED"), false);
  assert.equal(canTransition("CLOSED", "IN_PROGRESS"), false);
  assert.equal(TRANSITIONS.CLOSED.length, 0, "CLOSED is terminal");
});

check("every allowed transition maps to an audit event", () => {
  for (const [from, targets] of Object.entries(TRANSITIONS)) {
    for (const to of targets) {
      const event = TRANSITION_EVENT[`${from}->${to}`];
      assert.ok(event, `no audit event mapped for ${from} -> ${to}`);
      assert.ok(
        (AUDIT_EVENTS as readonly string[]).includes(event),
        `${event} is not in the audit vocabulary`
      );
    }
  }
});

console.log("\nroles");

check("role ranking gates the four roles correctly", () => {
  assert.equal(hasAtLeast("ADMIN", "LEADER"), true);
  assert.equal(hasAtLeast("MANAGER", "LEADER"), true);
  assert.equal(hasAtLeast("LEADER", "LEADER"), true);
  assert.equal(hasAtLeast("MEMBER", "LEADER"), false);
  assert.equal(hasAtLeast("MEMBER", "MEMBER"), true);
});

check("AD groups map to roles, most privileged wins", () => {
  process.env.AD_GROUP_ADMIN = "WAT-Admins";
  process.env.AD_GROUP_MANAGER = "WAT-Managers";
  process.env.AD_GROUP_LEADER = "WAT-Leaders";
  process.env.AD_GROUP_MEMBER = "WAT-Members";

  assert.equal(roleFromGroups(["WAT-Members"]), "MEMBER");
  assert.equal(roleFromGroups(["wat-leaders"]), "LEADER", "AD is case-insensitive");
  assert.equal(
    roleFromGroups(["WAT-Members", "WAT-Managers"]),
    "MANAGER",
    "most privileged group wins"
  );
  assert.equal(roleFromGroups(["Domain Users"]), null, "unknown groups fall through");
  assert.equal(roleFromGroups([]), null);
});

console.log(`\n${checks} checks passed.\n`);
