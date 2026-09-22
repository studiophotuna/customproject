import type { Metadata } from "next";

import "./globals.css";
import { AppHeader } from "@/components/AppHeader";

export const metadata: Metadata = {
  title: "Workload Allocation",
  description: "Internal work request allocation and SLA tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <AppHeader />
        <main className="mx-auto max-w-[1400px] px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
