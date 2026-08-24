import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader, StatCard, Panel, Badge } from "@/components/admin/ui";
import { formatPrice } from "@/lib/utils";

const HEAD = { count: "exact" as const, head: true };

export default async function AdminDashboard() {
  const supabase = await createClient();

  const [
    { count: products },
    { count: categories },
    { count: newRequests },
    { count: unreadMessages },
    { count: subscribers },
    { count: pendingOrders },
  ] = await Promise.all([
    supabase.from("products").select("*", HEAD),
    supabase.from("categories").select("*", HEAD),
    supabase.from("custom_cake_requests").select("*", HEAD).eq("status", "new"),
    supabase.from("contact_messages").select("*", HEAD).eq("is_read", false),
    supabase.from("newsletter_subscribers").select("*", HEAD),
    supabase.from("orders").select("*", HEAD).eq("status", "pending"),
  ]);

  const { data: recentRequests } = await supabase
    .from("custom_cake_requests")
    .select("id, name, occasion, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  const { data: recentOrders } = await supabase
    .from("orders")
    .select("id, order_number, customer_name, total, currency, status, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <>
      <AdminHeader title="Dashboard" description="An overview of your store." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Products" value={products ?? 0} href="/admin/products" />
        <StatCard label="Categories" value={categories ?? 0} href="/admin/categories" />
        <StatCard label="Pending orders" value={pendingOrders ?? 0} href="/admin/orders" />
        <StatCard label="New cake requests" value={newRequests ?? 0} href="/admin/requests" />
        <StatCard label="Unread messages" value={unreadMessages ?? 0} href="/admin/messages" />
        <StatCard label="Subscribers" value={subscribers ?? 0} href="/admin/subscribers" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel className="p-5">
          <h2 className="mb-4 font-semibold text-foreground">Recent cake requests</h2>
          {recentRequests && recentRequests.length > 0 ? (
            <ul className="divide-y divide-line">
              {recentRequests.map((r) => (
                <li key={r.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium">{r.name}</span>
                    {r.occasion ? <span className="text-muted"> · {r.occasion}</span> : null}
                  </span>
                  <Badge tone={r.status === "new" ? "amber" : "muted"}>{r.status}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No requests yet.</p>
          )}
          <Link href="/admin/requests" className="mt-3 inline-block text-sm text-brand">
            View all →
          </Link>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 font-semibold text-foreground">Recent orders</h2>
          {recentOrders && recentOrders.length > 0 ? (
            <ul className="divide-y divide-line">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    <span className="font-medium">#{o.order_number}</span>
                    <span className="text-muted"> · {o.customer_name ?? "—"}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    {formatPrice(Number(o.total), o.currency)}
                    <Badge tone="muted">{o.status}</Badge>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">
              No orders yet. Checkout goes live once Stripe is connected.
            </p>
          )}
          <Link href="/admin/orders" className="mt-3 inline-block text-sm text-brand">
            View all →
          </Link>
        </Panel>
      </div>
    </>
  );
}
