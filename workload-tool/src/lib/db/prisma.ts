import { PrismaClient } from "@prisma/client";

// A single client per process.
//
// Next's dev server reloads modules on every edit, and serverless platforms
// start a fresh instance per concurrent request, so without the global cache
// each one would open another pool.

/**
 * Serverless + a session-mode pooler is a bad combination unless the per-process
 * pool is pinned small.
 *
 * Supabase's session pooler allows 15 clients in total. Prisma's default pool
 * size is (cpus * 2 + 1), so two or three warm lambdas can claim the whole
 * allowance and every later request dies with
 * `FATAL: (EMAXCONNSESSION) max clients reached in session mode`.
 *
 * One connection per instance keeps concurrency governed by the number of
 * instances rather than multiplied by it, and `pool_timeout` makes a request
 * that arrives while the connection is busy wait its turn instead of failing.
 *
 * Doing this here rather than in the connection string means a URL pasted
 * straight from the Supabase dashboard is safe as-is; an explicit value in the
 * URL still wins.
 */
function connectionUrl(): string | undefined {
  const raw = process.env.DATABASE_URL;
  if (!raw) return undefined;

  // A malformed URL is a configuration problem; let Prisma report it clearly
  // rather than throwing an opaque parse error from here.
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw;
  }

  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set("connection_limit", "1");
  }
  if (!url.searchParams.has("pool_timeout")) {
    url.searchParams.set("pool_timeout", "20");
  }
  return url.toString();
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: connectionUrl(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
