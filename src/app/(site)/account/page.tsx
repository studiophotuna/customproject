import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { ProfileForm } from "@/components/auth/ProfileForm";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { signOutToHome } from "@/app/actions/auth";
import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isAdminRole } from "@/lib/auth";
import { formatPrice, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My Account" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-line bg-background p-6">
      <h2 className="mb-4 font-semibold text-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default async function AccountPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login?next=/account");

  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select("id, order_number, total, currency, status, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  const isStaff = ["owner", "admin", "staff"].includes(profile.role);

  return (
    <Container className="py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="section-title text-3xl uppercase text-brand">My Account</h1>
          <p className="mt-1 text-sm text-muted">
            {profile.full_name ? `${profile.full_name} · ` : ""}
            {profile.email}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isStaff && (
            <Link
              href="/admin"
              className="rounded-card border border-brand px-4 py-2 text-sm text-brand hover:bg-brand-light"
            >
              {isAdminRole(profile.role) ? "Admin dashboard" : "Staff dashboard"}
            </Link>
          )}
          <form action={signOutToHome}>
            <button className="rounded-card border border-line px-4 py-2 text-sm text-red-600 hover:bg-surface">
              Sign out
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Profile">
          <ProfileForm
            fullName={profile.full_name ?? ""}
            phone={profile.phone ?? ""}
            email={profile.email ?? ""}
          />
        </Section>

        <Section title="Change Password">
          <ChangePasswordForm />
        </Section>

        <div className="lg:col-span-2">
          <Section title="Order History">
            {orders && orders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead className="border-b border-line text-left text-xs uppercase text-muted">
                    <tr>
                      <th className="py-2">Order</th>
                      <th className="py-2">Date</th>
                      <th className="py-2">Total</th>
                      <th className="py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td className="py-2 font-medium">#{o.order_number}</td>
                        <td className="py-2 text-muted">{formatDate(o.created_at)}</td>
                        <td className="py-2">{formatPrice(Number(o.total), o.currency)}</td>
                        <td className="py-2 capitalize text-muted">{o.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted">
                You have no orders yet.{" "}
                <Link href="/shop" className="text-brand hover:underline">
                  Start shopping
                </Link>
                .
              </p>
            )}
          </Section>
        </div>
      </div>
    </Container>
  );
}
