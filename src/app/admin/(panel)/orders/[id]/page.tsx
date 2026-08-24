import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader, Panel } from "@/components/admin/ui";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { Constants } from "@/lib/database.types";
import { updateOrderStatus } from "../actions";
import { formatPrice, formatDate } from "@/lib/utils";

export const metadata = { title: "Order" };

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: order } = await supabase
    .from("orders")
    .select("*, order_items(*)")
    .eq("id", id)
    .maybeSingle();

  if (!order) notFound();
  const items = (order.order_items ?? []) as {
    id: string;
    name: string;
    price: number;
    quantity: number;
  }[];

  return (
    <>
      <Link href="/admin/orders" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-brand">
        <ArrowLeft className="h-4 w-4" /> Back to orders
      </Link>
      <AdminHeader
        title={`Order #${order.order_number}`}
        description={formatDate(order.created_at)}
        action={
          <StatusSelect
            value={order.status}
            options={Constants.public.Enums.order_status}
            action={updateOrderStatus.bind(null, order.id)}
          />
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel className="p-5 lg:col-span-2">
          <h2 className="mb-4 font-semibold text-foreground">Items</h2>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="py-2">{it.name}</td>
                  <td className="py-2 text-muted">×{it.quantity}</td>
                  <td className="py-2 text-right">
                    {formatPrice(Number(it.price) * it.quantity, order.currency)}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="py-2 text-muted">No line items.</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mt-4 space-y-1 border-t border-line pt-4 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span>{formatPrice(Number(order.subtotal), order.currency)}</span>
            </div>
            <div className="flex justify-between text-muted">
              <span>Delivery</span>
              <span>{formatPrice(Number(order.delivery_fee), order.currency)}</span>
            </div>
            <div className="flex justify-between font-semibold text-foreground">
              <span>Total</span>
              <span>{formatPrice(Number(order.total), order.currency)}</span>
            </div>
          </div>
        </Panel>

        <Panel className="p-5">
          <h2 className="mb-4 font-semibold text-foreground">Customer</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Name" value={order.customer_name} />
            <Row label="Email" value={order.customer_email} />
            <Row label="Phone" value={order.customer_phone} />
            <Row label="Method" value={order.delivery_method} />
            <Row label="Address" value={order.delivery_address} />
            <Row label="Notes" value={order.notes} />
          </dl>
        </Panel>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right text-foreground">{value || "—"}</dd>
    </div>
  );
}
