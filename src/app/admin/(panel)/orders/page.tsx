import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader, Panel, Badge } from "@/components/admin/ui";
import { formatPrice, formatDate } from "@/lib/utils";

export const metadata = { title: "Orders" };

const toneFor: Record<string, "green" | "amber" | "muted" | "red" | "brand"> = {
  paid: "green",
  completed: "green",
  ready: "brand",
  preparing: "brand",
  pending: "amber",
  cancelled: "red",
  refunded: "red",
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <AdminHeader title="Orders" description="Customer orders." />
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line bg-surface text-left text-xs uppercase text-muted">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Total</th>
              <th className="p-3">Status</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(data ?? []).map((o) => (
              <tr key={o.id} className="hover:bg-surface">
                <td className="p-3">
                  <Link href={`/admin/orders/${o.id}`} className="font-medium text-brand hover:underline">
                    #{o.order_number}
                  </Link>
                </td>
                <td className="p-3 text-muted">{o.customer_name ?? o.customer_email ?? "—"}</td>
                <td className="p-3">{formatPrice(Number(o.total), o.currency)}</td>
                <td className="p-3">
                  <Badge tone={toneFor[o.status] ?? "muted"}>{o.status}</Badge>
                </td>
                <td className="p-3 text-muted">{formatDate(o.created_at)}</td>
              </tr>
            ))}
            {(!data || data.length === 0) && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted">
                  No orders yet. Orders appear here once checkout is live.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
