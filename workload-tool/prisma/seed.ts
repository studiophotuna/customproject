// Seed a dev database through Prisma.
// -----------------------------------------------------------------------------
//   npm run db:seed     (SQL Server)     npm run pg:seed     (Postgres)
//
// Wipes and reloads the working tables, so it is safe to re-run while clicking
// through the app. It refuses a non-local DATABASE_URL unless
// SEED_ALLOW_NONLOCAL=1 — this script deletes every ticket and must never be
// pointed at a shared or production instance by accident.
//
// The dataset itself lives in prisma/seed-data.ts, shared with the SQL emitter.

import { PrismaClient } from "@prisma/client";

import { buildSeedData } from "./seed-data";

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

async function main(): Promise<void> {
  assertLocalDatabase();

  const data = buildSeedData();

  // Order matters: children before parents.
  await prisma.auditLog.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.ingestionRule.deleteMany();
  await prisma.mailboxConfig.deleteMany();
  await prisma.slaRule.deleteMany();

  await prisma.slaRule.createMany({ data: data.slaRules });
  await prisma.agent.createMany({ data: data.agents });
  await prisma.shift.createMany({ data: data.shifts });
  await prisma.mailboxConfig.createMany({ data: data.mailboxes });
  await prisma.ingestionRule.createMany({ data: data.ingestionRules });
  await prisma.ticket.createMany({ data: data.tickets });
  await prisma.assignment.createMany({ data: data.assignments });
  await prisma.auditLog.createMany({ data: data.auditLogs });

  console.log("Seed complete:", {
    agents: data.agents.length,
    shifts: data.shifts.length,
    slaRules: data.slaRules.length,
    tickets: data.tickets.length,
    unallocated: data.tickets.filter(
      (t) => t.status === "NEW" && t.currentAssigneeId === null
    ).length,
    auditRows: data.auditLogs.length,
  });
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
