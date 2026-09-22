// Seed for a LOCAL dev SQL Server.
// -----------------------------------------------------------------------------
//   npm run db:seed
//
// Wipes and reloads the working tables, so it is safe to re-run while clicking
// through the app. It refuses to run against a non-local DATABASE_URL unless
// SEED_ALLOW_NONLOCAL=1 — this script is destructive and must never be pointed
// at a shared or production instance by accident.

import { PrismaClient } from "@prisma/client";

import { dueAtFor } from "../src/lib/sla";

try {
  process.loadEnvFile();
} catch {
  // Fall back to the ambient environment.
}

const prisma = new PrismaClient();

const LOCAL_HOSTS = ["localhost", "127.0.0.1", "(local)", "host.docker.internal"];

/** Pull the host out of either connection-string shape. */
function databaseHost(url: string): string {
  // sqlserver://host:1433;database=...;user=... — semicolon-delimited, not a URL.
  if (/^sqlserver:/i.test(url)) {
    return url.replace(/^sqlserver:\/\//i, "").split(/[;:,\\]/)[0];
  }
  // postgresql://user:pass@host:5432/db
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function assertLocalDatabase(): void {
  const url = process.env.DATABASE_URL ?? "";
  if (process.env.SEED_ALLOW_NONLOCAL === "1") return;

  const host = databaseHost(url);
  if (!LOCAL_HOSTS.includes(host.toLowerCase())) {
    throw new Error(
      `Refusing to seed: DATABASE_URL host "${host}" is not local. ` +
        "This script deletes every ticket. Set SEED_ALLOW_NONLOCAL=1 to override."
    );
  }
}

/** Today at a given local hour, offset by whole days. */
function at(hour: number, dayOffset = 0, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function minutesAgo(minutes: number): Date {
  return new Date(Date.now() - minutes * 60_000);
}

const AGENTS = [
  {
    adUpn: "admin@contoso.local",
    displayName: "Dev Admin",
    role: "ADMIN",
    concurrentCap: 5,
    onShift: true,
  },
  {
    adUpn: "manager@contoso.local",
    displayName: "Priya Manager",
    role: "MANAGER",
    concurrentCap: 5,
    onShift: true,
  },
  {
    adUpn: "leader@contoso.local",
    displayName: "Sam Leader",
    role: "LEADER",
    concurrentCap: 4,
    onShift: true,
  },
  {
    adUpn: "alice@contoso.local",
    displayName: "Alice Brennan",
    role: "MEMBER",
    concurrentCap: 5,
    onShift: true,
  },
  {
    adUpn: "bob@contoso.local",
    displayName: "Bob Ferreira",
    role: "MEMBER",
    concurrentCap: 3,
    onShift: true,
  },
  {
    adUpn: "carol@contoso.local",
    displayName: "Carol Nwosu",
    role: "MEMBER",
    concurrentCap: 5,
    // On leave in data/leave-wfh.stub.json — on shift, but the scheduler blocks
    // her, so the allocator should skip her.
    onShift: true,
  },
  {
    adUpn: "dan@contoso.local",
    displayName: "Dan Okafor",
    role: "MEMBER",
    concurrentCap: 5,
    // Deliberately off shift so "on shift now?" is visibly exercised.
    onShift: false,
  },
] as const;

const SLA_RULES = [
  { ticketType: "Incident - Critical", slaMinutes: 60, businessHoursOnly: false },
  { ticketType: "Incident - Standard", slaMinutes: 240, businessHoursOnly: true },
  { ticketType: "Service Request", slaMinutes: 480, businessHoursOnly: true },
  { ticketType: "Change Request", slaMinutes: 2880, businessHoursOnly: true },
  { ticketType: "General Enquiry", slaMinutes: 960, businessHoursOnly: true },
];

async function main(): Promise<void> {
  assertLocalDatabase();

  // Order matters: children before parents.
  await prisma.auditLog.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.ingestionRule.deleteMany();
  await prisma.mailboxConfig.deleteMany();
  await prisma.slaRule.deleteMany();

  for (const rule of SLA_RULES) {
    await prisma.slaRule.create({ data: { ...rule, active: true } });
  }

  const agentsByUpn = new Map<string, string>();
  for (const agent of AGENTS) {
    const created = await prisma.agent.create({
      data: {
        adUpn: agent.adUpn,
        displayName: agent.displayName,
        role: agent.role,
        concurrentCap: agent.concurrentCap,
        active: true,
      },
      select: { id: true },
    });
    agentsByUpn.set(agent.adUpn, created.id);

    if (agent.onShift) {
      // A wide window either side of now, plus tomorrow, so the demo does not
      // depend on what time of day you run it.
      for (const offset of [-1, 0, 1]) {
        await prisma.shift.create({
          data: {
            agentId: created.id,
            startsAt: at(0, offset, 1),
            endsAt: at(23, offset, 59),
          },
        });
      }
    } else {
      // Yesterday only — off shift now.
      await prisma.shift.create({
        data: {
          agentId: created.id,
          startsAt: at(0, -1, 1),
          endsAt: at(23, -1, 59),
        },
      });
    }
  }

  const mailbox = await prisma.mailboxConfig.create({
    data: {
      address: "workrequests@contoso.local",
      // Nothing reads this yet: only the stub adapter exists.
      platform: "EXCHANGE_ONPREM",
      active: true,
    },
    select: { id: true },
  });

  const RULES = [
    { matchKind: "SUBJECT_KEYWORD", matchValue: "urgent", ticketType: "Incident - Critical", ruleOrder: 10 },
    { matchKind: "SUBJECT_KEYWORD", matchValue: "incident", ticketType: "Incident - Standard", ruleOrder: 20 },
    { matchKind: "SUBJECT_KEYWORD", matchValue: "change", ticketType: "Change Request", ruleOrder: 30 },
    { matchKind: "TO_ADDRESS", matchValue: "workrequests@contoso.local", ticketType: "Service Request", ruleOrder: 100 },
  ];
  for (const rule of RULES) {
    await prisma.ingestionRule.create({ data: { ...rule, mailboxId: mailbox.id } });
  }

  // --- Tickets ---------------------------------------------------------------
  // A spread across the lifecycle plus several unallocated NEW ones, so the
  // first worker pass has something to do.
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

  for (const spec of TICKETS) {
    const rule = SLA_RULES.find((r) => r.ticketType === spec.type)!;
    const receivedAt = minutesAgo(spec.minutesAgo);
    const dueAt = dueAtFor({
      receivedAt,
      slaMinutes: rule.slaMinutes,
      businessHoursOnly: rule.businessHoursOnly,
    });
    const assigneeId = spec.assignee ? agentsByUpn.get(spec.assignee)! : null;

    const ticket = await prisma.ticket.create({
      data: {
        source: "MANUAL",
        subject: spec.subject,
        body: `Seeded sample request: ${spec.subject}.`,
        ticketType: spec.type,
        receivedAt,
        dueAt,
        status: spec.status,
        currentAssigneeId: assigneeId,
        holdReason: "holdReason" in spec ? spec.holdReason : null,
        onHoldSince: spec.status === "ON_HOLD" ? minutesAgo(45) : null,
        resolvedAt:
          spec.status === "RESOLVED" || spec.status === "CLOSED"
            ? minutesAgo(Math.max(1, spec.minutesAgo - 120))
            : null,
        closedAt: spec.status === "CLOSED" ? minutesAgo(Math.max(1, spec.minutesAgo - 60)) : null,
      },
      select: { id: true },
    });

    await prisma.auditLog.create({
      data: {
        ticketId: ticket.id,
        actor: "SYSTEM",
        event: "CREATED",
        detailsJson: JSON.stringify({
          seeded: true,
          ticketType: spec.type,
          slaMinutes: rule.slaMinutes,
          businessHoursOnly: rule.businessHoursOnly,
        }),
      },
    });

    if (assigneeId) {
      await prisma.assignment.create({
        data: {
          ticketId: ticket.id,
          agentId: assigneeId,
          reason: "AUTO",
          assignedAt: minutesAgo(Math.max(1, spec.minutesAgo - 5)),
        },
      });
      await prisma.auditLog.create({
        data: {
          ticketId: ticket.id,
          actor: "SYSTEM",
          event: "ASSIGNED",
          detailsJson: JSON.stringify({ seeded: true, to: spec.assignee }),
        },
      });
    }
  }

  const counts = {
    agents: await prisma.agent.count(),
    shifts: await prisma.shift.count(),
    slaRules: await prisma.slaRule.count(),
    tickets: await prisma.ticket.count(),
    unallocated: await prisma.ticket.count({
      where: { status: "NEW", currentAssigneeId: null },
    }),
    auditRows: await prisma.auditLog.count(),
  };
  console.log("Seed complete:", counts);
  console.log(
    "Sign in as any seeded upn via the dev identity switcher, e.g. leader@contoso.local."
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
