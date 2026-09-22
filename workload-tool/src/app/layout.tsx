import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "WorkloadFlow",
  description:
    "Internal workload allocation: time-bound job tickets auto-allocated to available FTEs by SLA and shift rules.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
