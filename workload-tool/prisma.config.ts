import { defineConfig } from "prisma/config";

// A Prisma config file switches OFF Prisma's own .env loading, so load it here.
// Node 20.12+/22 does this natively — no dotenv dependency.
try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the ambient environment (how it runs in production).
}

// Prisma 7 removes the `prisma` key in package.json; configuring here keeps the
// seed command wired without the deprecation warning.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
