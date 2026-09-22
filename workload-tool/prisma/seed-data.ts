// Seed dataset — pure. No database, no I/O.
// -----------------------------------------------------------------------------
// Shared by the two seed drivers so the data cannot drift between them:
//   prisma/seed.ts        writes it through Prisma (local SQL Server / Postgres)
//   scripts/seed-to-sql.ts emits INSERT statements for a database you cannot
//                          reach with Prisma (e.g. Supabase without the password)
//
// Every id is generated up front so foreign keys can be wired without a
// round-trip, which is what makes the SQL emitter possible.

import { randomUUID } from "node:crypto";

import { dueAtFor } from "../src/lib/sla";
import { SETTING_DEFINITIONS } from "../src/lib/domain/work";

export interface AgentRow {
  id: string;
  adUpn: string;
  displayName: string;
  role: string;
  concurrentCap: number;
  active: boolean;
}

export interface ShiftRow {
  id: string;
  agentId: string;
  startsAt: Date;
  endsAt: Date;
}

export interface SlaRuleRow {
  id: string;
  ticketType: string;
  slaMinutes: number;
  businessHoursOnly: boolean;
  active: boolean;
}

export interface TicketRow {
  id: string;
  source: string;
  externalRef: string | null;
  subject: string;
  body: string | null;
  ticketType: string;
  receivedAt: Date;
  dueAt: Date;
  status: string;
  currentAssigneeId: string | null;
  onHoldSince: Date | null;
  holdAccumulatedMinutes: number;
  holdReason: string | null;
  resolvedAt: Date | null;
  closedAt: Date | null;
  updatedAt: Date;
}

export interface AssignmentRow {
  id: string;
  ticketId: string;
  agentId: string;
  reason: string;
  assignedAt: Date;
  unassignedAt: Date | null;
}

export interface AuditRow {
  id: string;
  ticketId: string | null;
  actor: string;
  event: string;
  detailsJson: string | null;
  at: Date;
}

export interface MailboxRow {
  id: string;
  address: string;
  platform: string;
  active: boolean;
}

export interface IngestionRuleRow {
  id: string;
  mailboxId: string;
  matchKind: string;
  matchValue: string;
  ticketType: string;
  ruleOrder: number;
}

export interface AppSettingRow {
  key: string;
  value: string;
  label: string;
  description: string | null;
}

export interface WorkSessionRow {
  id: string;
  agentId: string;
  startedAt: Date;
  endedAt: Date | null;
}

export interface ActivityRow {
  id: string;
  sessionId: string;
  kind: string;
  ticketId: string | null;
  startedAt: Date;
  endedAt: Date | null;
  note: string | null;
}

export interface SeedData {
  agents: AgentRow[];
  shifts: ShiftRow[];
  slaRules: SlaRuleRow[];
  mailboxes: MailboxRow[];
  ingestionRules: IngestionRuleRow[];
  tickets: TicketRow[];
  assignments: AssignmentRow[];
  auditLogs: AuditRow[];
  appSettings: AppSettingRow[];
  workSessions: WorkSessionRow[];
  activities: ActivityRow[];
}

const AGENTS = [
  { adUpn: "admin@contoso.local", displayName: "Dev Admin", role: "ADMIN", concurrentCap: 5, onShift: true },
  { adUpn: "manager@contoso.local", displayName: "Priya Manager", role: "MANAGER", concurrentCap: 5, onShift: true },
  { adUpn: "leader@contoso.local", displayName: "Sam Leader", role: "LEADER", concurrentCap: 4, onShift: true },
  { adUpn: "alice@contoso.local", displayName: "Alice Brennan", role: "MEMBER", concurrentCap: 5, onShift: true },
  { adUpn: "bob@contoso.local", displayName: "Bob Ferreira", role: "MEMBER", concurrentCap: 3, onShift: true },
  // On leave in data/leave-wfh.stub.json — on shift, but the scheduler blocks
  // her, so the allocator should visibly skip her.
  { adUpn: "carol@contoso.local", displayName: "Carol Nwosu", role: "MEMBER", concurrentCap: 5, onShift: true },
  // Deliberately off shift so "on shift now?" is exercised too.
  { adUpn: "dan@contoso.local", displayName: "Dan Okafor", role: "MEMBER", concurrentCap: 5, onShift: false },
] as const;

export const SLA_RULES = [
  { ticketType: "Incident - Critical", slaMinutes: 60, businessHoursOnly: false },
  { ticketType: "Incident - Standard", slaMinutes: 240, businessHoursOnly: true },
  { ticketType: "Service Request", slaMinutes: 480, businessHoursOnly: true },
  { ticketType: "Change Request", slaMinutes: 2880, businessHoursOnly: true },
  { ticketType: "General Enquiry", slaMinutes: 960, businessHoursOnly: true },
] as const;

const INGESTION_RULES = [
  { matchKind: "SUBJECT_KEYWORD", matchValue: "urgent", ticketType: "Incident - Critical", ruleOrder: 10 },
  { matchKind: "SUBJECT_KEYWORD", matchValue: "incident", ticketType: "Incident - Standard", ruleOrder: 20 },
  { matchKind: "SUBJECT_KEYWORD", matchValue: "change", ticketType: "Change Request", ruleOrder: 30 },
  { matchKind: "TO_ADDRESS", matchValue: "workrequests@contoso.local", ticketType: "Service Request", ruleOrder: 100 },
] as const;

const TICKETS = [
  { subject: "Payroll export failing for October", type: "Incident - Critical", minutesAgo: 25, status: "NEW", assignee: null },
  { subject: "VPN drops every 10 minutes", type: "Incident - Standard", minutesAgo: 95, status: "NEW", assignee: null },
  { subject: "New starter kit for M. Adeyemi", type: "Service Request", minutesAgo: 140, status: "NEW", assignee: null },
  { subject: "Request laptop replacement (cracked screen)", type: "Service Request", minutesAgo: 200, status: "NEW", assignee: null },
  { subject: "Firewall rule change for finance subnet", type: "Change Request", minutesAgo: 320, status: "NEW", assignee: null },
  { subject: "Shared drive permissions for HR", type: "Service Request", minutesAgo: 400, status: "ASSIGNED", assignee: "alice@contoso.local" },
  { subject: "Printer offline on 3rd floor", type: "Incident - Standard", minutesAgo: 480, status: "IN_PROGRESS", assignee: "alice@contoso.local" },
  { subject: "SSO login loop for contractors", type: "Incident - Critical", minutesAgo: 60, status: "IN_PROGRESS", assignee: "bob@contoso.local" },
  { subject: "Archive mailboxes for leavers Q3", type: "General Enquiry", minutesAgo: 1500, status: "ON_HOLD", assignee: "bob@contoso.local", holdReason: "Waiting on HR leaver list" },
  { subject: "Update DNS for intranet migration", type: "Change Request", minutesAgo: 2000, status: "RESOLVED", assignee: "leader@contoso.local" },
  { subject: "Password reset for J. Tan", type: "Service Request", minutesAgo: 3000, status: "CLOSED", assignee: "leader@contoso.local" },
  { subject: "Expense tool timing out at month end", type: "Incident - Standard", minutesAgo: 30, status: "NEW", assignee: null },
] as const;

/** Build the whole dataset relative to `now`. Deterministic apart from the uuids. */
export function buildSeedData(now: Date = new Date()): SeedData {
  const minutesAgo = (m: number) => new Date(now.getTime() - m * 60_000);
  const dayAt = (hour: number, dayOffset: number, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d;
  };

  const agents: AgentRow[] = [];
  const shifts: ShiftRow[] = [];
  const byUpn = new Map<string, string>();

  for (const spec of AGENTS) {
    const id = randomUUID();
    byUpn.set(spec.adUpn, id);
    agents.push({
      id,
      adUpn: spec.adUpn,
      displayName: spec.displayName,
      role: spec.role,
      concurrentCap: spec.concurrentCap,
      active: true,
    });

    // A wide window either side of now (plus tomorrow) so the demo does not
    // depend on what time of day it is run.
    const offsets = spec.onShift ? [-1, 0, 1] : [-1];
    for (const offset of offsets) {
      shifts.push({
        id: randomUUID(),
        agentId: id,
        startsAt: dayAt(0, offset, 1),
        endsAt: dayAt(23, offset, 59),
      });
    }
  }

  const slaRules: SlaRuleRow[] = SLA_RULES.map((rule) => ({
    id: randomUUID(),
    ticketType: rule.ticketType,
    slaMinutes: rule.slaMinutes,
    businessHoursOnly: rule.businessHoursOnly,
    active: true,
  }));

  const mailboxId = randomUUID();
  const mailboxes: MailboxRow[] = [
    {
      id: mailboxId,
      address: "workrequests@contoso.local",
      // Nothing reads this yet: only the stub adapter exists.
      platform: "EXCHANGE_ONPREM",
      active: true,
    },
  ];
  const ingestionRules: IngestionRuleRow[] = INGESTION_RULES.map((rule) => ({
    id: randomUUID(),
    mailboxId,
    ...rule,
  }));

  const tickets: TicketRow[] = [];
  const assignments: AssignmentRow[] = [];
  const auditLogs: AuditRow[] = [];

  for (const spec of TICKETS) {
    const rule = SLA_RULES.find((r) => r.ticketType === spec.type)!;
    const receivedAt = minutesAgo(spec.minutesAgo);
    const dueAt = dueAtFor({
      receivedAt,
      slaMinutes: rule.slaMinutes,
      businessHoursOnly: rule.businessHoursOnly,
    });
    const assigneeId = spec.assignee ? byUpn.get(spec.assignee)! : null;
    const settled = spec.status === "RESOLVED" || spec.status === "CLOSED";
    const ticketId = randomUUID();

    tickets.push({
      id: ticketId,
      source: "MANUAL",
      externalRef: null,
      subject: spec.subject,
      body: `Seeded sample request: ${spec.subject}.`,
      ticketType: spec.type,
      receivedAt,
      dueAt,
      status: spec.status,
      currentAssigneeId: assigneeId,
      // The Ticket_onHoldSince_check constraint ties this to the status.
      onHoldSince: spec.status === "ON_HOLD" ? minutesAgo(45) : null,
      holdAccumulatedMinutes: 0,
      holdReason: "holdReason" in spec ? spec.holdReason : null,
      resolvedAt: settled ? minutesAgo(Math.max(1, spec.minutesAgo - 120)) : null,
      closedAt: spec.status === "CLOSED" ? minutesAgo(Math.max(1, spec.minutesAgo - 60)) : null,
      updatedAt: now,
    });

    auditLogs.push({
      id: randomUUID(),
      ticketId,
      actor: "SYSTEM",
      event: "CREATED",
      detailsJson: JSON.stringify({
        seeded: true,
        ticketType: spec.type,
        slaMinutes: rule.slaMinutes,
        businessHoursOnly: rule.businessHoursOnly,
      }),
      at: receivedAt,
    });

    if (assigneeId) {
      const assignedAt = minutesAgo(Math.max(1, spec.minutesAgo - 5));
      assignments.push({
        id: randomUUID(),
        ticketId,
        agentId: assigneeId,
        reason: "AUTO",
        assignedAt,
        unassignedAt: null,
      });
      auditLogs.push({
        id: randomUUID(),
        ticketId,
        actor: "SYSTEM",
        event: "ASSIGNED",
        detailsJson: JSON.stringify({ seeded: true, to: spec.assignee }),
        at: assignedAt,
      });
    }
  }

  // --- Admin-editable targets ------------------------------------------------
  const appSettings: AppSettingRow[] = SETTING_DEFINITIONS.map((def) => ({
    key: def.key,
    value: def.fallback,
    label: def.label,
    description: def.description,
  }));

  // --- A day of recorded time -------------------------------------------------
  // Without this the utilization and timeliness panels would open empty, which
  // reads as "broken" rather than "nobody has worked yet". Alice and Sam have a
  // closed session each; Bob is still clocked in and mid-ticket, so a live timer
  // is visible the moment the app is opened.
  const workSessions: WorkSessionRow[] = [];
  const activities: ActivityRow[] = [];

  const ticketOf = (subject: string) =>
    tickets.find((t) => t.subject === subject)?.id ?? null;

  function session(
    agentUpn: string,
    startMinutesAgo: number,
    endMinutesAgo: number | null,
    spans: { kind: string; minutes: number; ticket?: string | null; note?: string }[]
  ): void {
    const agentId = byUpn.get(agentUpn);
    if (!agentId) return;

    const sessionId = randomUUID();
    workSessions.push({
      id: sessionId,
      agentId,
      startedAt: minutesAgo(startMinutesAgo),
      endedAt: endMinutesAgo === null ? null : minutesAgo(endMinutesAgo),
    });

    let cursor = startMinutesAgo;
    for (const span of spans) {
      const endsAt = cursor - span.minutes;
      activities.push({
        id: randomUUID(),
        sessionId,
        kind: span.kind,
        ticketId: span.ticket ? ticketOf(span.ticket) : null,
        startedAt: minutesAgo(cursor),
        // A negative end means the span is still running.
        endedAt: endsAt <= 0 ? null : minutesAgo(endsAt),
        note: span.note ?? null,
      });
      cursor = endsAt;
      if (cursor <= 0) break;
    }
  }

  session("alice@contoso.local", 420, 30, [
    { kind: "TICKET", minutes: 95, ticket: "Shared drive permissions for HR" },
    { kind: "MEETING", minutes: 45, note: "Weekly ops sync" },
    { kind: "TICKET", minutes: 130, ticket: "Printer offline on 3rd floor" },
    { kind: "BREAK", minutes: 40 },
    { kind: "ADHOC", minutes: 80, note: "Rate sheet validation" },
  ]);

  session("leader@contoso.local", 400, 60, [
    { kind: "TICKET", minutes: 120, ticket: "Update DNS for intranet migration" },
    { kind: "MEETING", minutes: 60, note: "Capacity review" },
    { kind: "ADHOC", minutes: 70, note: "Queue triage" },
    { kind: "BREAK", minutes: 30 },
  ]);

  // Still open: Bob is on shift and currently working a ticket.
  session("bob@contoso.local", 260, null, [
    { kind: "TICKET", minutes: 85, ticket: "Archive mailboxes for leavers Q3" },
    { kind: "BREAK", minutes: 25 },
    { kind: "TRAINING", minutes: 50, note: "New tariff process" },
    { kind: "TICKET", minutes: 200, ticket: "SSO login loop for contractors" },
  ]);

  return {
    agents,
    shifts,
    slaRules,
    mailboxes,
    ingestionRules,
    tickets,
    assignments,
    auditLogs,
    appSettings,
    workSessions,
    activities,
  };
}
