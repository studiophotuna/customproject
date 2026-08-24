import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader, Panel, Badge } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteProduct } from "./actions";
import { formatPrice } from "@/lib/utils";

export const metadata = { title: "Products" };

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: products } = await supabase
    .from("products")
    .select("*, categories(name)")
    .order("sort_order");

  return (
    <>
      <AdminHeader
        title="Products"
        description="Manage your catalog."
        action={
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 rounded-card bg-brand px-4 py-2 text-sm text-on-brand hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" /> New product
          </Link>
        }
      />

      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-line bg-surface text-left text-xs uppercase text-muted">
            <tr>
              <th className="p-3">Product</th>
              <th className="p-3">Category</th>
              <th className="p-3">Price</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(products ?? []).map((p) => (
              <tr key={p.id}>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-line bg-surface">
                      <Image
                        src={p.image_url ?? "/images/placeholder-cake.svg"}
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-medium text-foreground">{p.name}</div>
                      <div className="flex gap-1">
                        {p.featured && <Badge tone="brand">featured</Badge>}
                        {p.is_new && <Badge tone="amber">new</Badge>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-muted">
                  {(p.categories as { name: string } | null)?.name ?? "—"}
                </td>
                <td className="p-3">{formatPrice(Number(p.price), p.currency)}</td>
                <td className="p-3">
                  {p.is_active ? (
                    <Badge tone="green">active</Badge>
                  ) : (
                    <Badge tone="muted">hidden</Badge>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/admin/products/${p.id}`} className="text-brand hover:underline">
                      Edit
                    </Link>
                    <DeleteButton action={deleteProduct.bind(null, p.id)} compact />
                  </div>
                </td>
              </tr>
            ))}
            {(!products || products.length === 0) && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted">
                  No products yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
