import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader, Panel, Badge } from "@/components/admin/ui";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { deleteCategory } from "./actions";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order");

  return (
    <>
      <AdminHeader
        title="Categories"
        description="Organize your catalog."
        action={
          <Link
            href="/admin/categories/new"
            className="inline-flex items-center gap-2 rounded-card bg-brand px-4 py-2 text-sm text-on-brand hover:bg-brand-dark"
          >
            <Plus className="h-4 w-4" /> New category
          </Link>
        }
      />
      <Panel className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead className="border-b border-line bg-surface text-left text-xs uppercase text-muted">
            <tr>
              <th className="p-3">Category</th>
              <th className="p-3">Slug</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(categories ?? []).map((c) => (
              <tr key={c.id}>
                <td className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md border border-line bg-surface">
                      <Image src={c.image_url ?? "/images/placeholder-cake.svg"} alt="" fill sizes="40px" className="object-cover" />
                    </div>
                    <span className="font-medium text-foreground">{c.name}</span>
                  </div>
                </td>
                <td className="p-3 text-muted">{c.slug}</td>
                <td className="p-3">
                  {c.is_active ? <Badge tone="green">active</Badge> : <Badge tone="muted">hidden</Badge>}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-3">
                    <Link href={`/admin/categories/${c.id}`} className="text-brand hover:underline">Edit</Link>
                    <DeleteButton action={deleteCategory.bind(null, c.id)} compact />
                  </div>
                </td>
              </tr>
            ))}
            {(!categories || categories.length === 0) && (
              <tr><td colSpan={4} className="p-6 text-center text-muted">No categories yet.</td></tr>
            )}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
