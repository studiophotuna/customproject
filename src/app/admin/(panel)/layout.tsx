import type { Metadata } from "next";
import { Sidebar } from "@/components/admin/Sidebar";
import { requireStaff, isAdminRole } from "@/lib/auth";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Admin" },
};

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side guard (defence in depth alongside the proxy).
  const profile = await requireStaff();

  return (
    <div className="flex min-h-screen flex-col bg-surface lg:flex-row">
      <Sidebar
        isAdmin={isAdminRole(profile.role)}
        userLabel={`${profile.full_name ?? profile.email ?? "User"} · ${profile.role}`}
      />
      <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  );
}
