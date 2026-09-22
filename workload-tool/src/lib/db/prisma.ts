import { PrismaClient } from "@prisma/client";

// A single client per process. Next's dev server reloads modules on every edit,
// so without the global cache each reload would open a fresh SQL Server pool
// and exhaust connections. The standalone worker imports this too and simply
// gets one client for its lifetime.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["warn", "error"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
