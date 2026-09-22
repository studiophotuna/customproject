import path from "node:path";
import { fileURLToPath } from "node:url";

import type { NextConfig } from "next";

// This app lives in a subdirectory of a repo that holds an unrelated Next.js
// app, so Turbopack would otherwise infer the parent as the workspace root and
// pull in that app's files. Pin the root to this directory.
const here = path.dirname(fileURLToPath(import.meta.url));

// On-prem only: no image CDNs, no external rewrites, no cloud integrations.
// Everything this app talks to lives inside the network.
const nextConfig: NextConfig = {
  turbopack: {
    root: here,
  },
  // Keep Prisma's engine binaries in the traced output when deploying behind IIS.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/.prisma/client/**"],
  },
};

export default nextConfig;
