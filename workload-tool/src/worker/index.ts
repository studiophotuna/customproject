// Allocation worker — a standalone process, not a web request.
// -----------------------------------------------------------------------------
//   npm run worker        # loop forever, WORKER_INTERVAL_MS between passes
//   npm run worker:once   # a single pass, then exit (cron / manual runs)
//
// It is deliberately independent of the Next.js server: no HTTP entry point can
// trigger allocation, so a slow pass cannot hold a user request open and a web
// restart cannot interrupt an in-flight assignment. In production this runs as
// a Windows Service (or a scheduled task using --once) next to the site.

import { prisma } from "@/lib/db/prisma";
import { configFromEnv, runAllocationPass } from "@/lib/allocation/run";
import { ingestMailbox } from "@/worker/ingest";

// Node 20.12+/22 reads .env natively; no dotenv dependency needed.
try {
  process.loadEnvFile();
} catch {
  // No .env file — rely on the ambient environment (how it runs in prod).
}

const ONCE = process.argv.includes("--once");
const INTERVAL_MS = Number(process.env.WORKER_INTERVAL_MS ?? 15_000);

let stopping = false;

function log(event: string, fields: Record<string, unknown> = {}): void {
  // One JSON object per line: greppable, and ready for whatever log shipper
  // the internal hosts use. No external telemetry.
  process.stdout.write(
    JSON.stringify({ ts: new Date().toISOString(), event, ...fields }) + "\n"
  );
}

async function pass(): Promise<void> {
  const started = Date.now();

  // Mail ingestion runs first so anything that arrived is in the queue before
  // allocation looks at it. Today this is a no-op: only the stub adapter exists.
  const ingested = await ingestMailbox();

  const result = await runAllocationPass();

  log("allocation.pass", {
    ms: Date.now() - started,
    ingested,
    pending: result.pendingCount,
    candidates: result.candidateCount,
    available: result.availableCount,
    assigned: result.assigned,
    skipped: result.skipped,
    ordering: result.config.ordering,
    policy: result.config.policy,
    blockedByScheduler: result.schedulerBlocked,
  });
}

async function main(): Promise<void> {
  const config = configFromEnv();
  log("worker.start", {
    mode: ONCE ? "once" : "loop",
    intervalMs: ONCE ? null : INTERVAL_MS,
    ordering: config.ordering,
    policy: config.policy,
  });

  if (ONCE) {
    await pass();
    return;
  }

  while (!stopping) {
    try {
      await pass();
    } catch (error) {
      // A failed pass must not kill the worker: the tickets are still pending
      // and the next pass retries them.
      log("allocation.error", {
        message: error instanceof Error ? error.message : String(error),
      });
    }
    await sleep(INTERVAL_MS);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    // Do not hold the event loop open during shutdown.
    timer.unref?.();
    const check = setInterval(() => {
      if (stopping) {
        clearTimeout(timer);
        clearInterval(check);
        resolve();
      }
    }, 250);
    check.unref?.();
  });
}

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => {
    if (stopping) process.exit(1); // second signal: give up waiting
    stopping = true;
    log("worker.stopping", { signal });
  });
}

main()
  .then(() => log("worker.stopped"))
  .catch((error) => {
    log("worker.fatal", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
