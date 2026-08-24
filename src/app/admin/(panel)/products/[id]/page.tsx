import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { updateProduct } from "../actions";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("sort_order"),
  ]);

  if (!product) notFound();

  return (
    <>
      <AdminHeader title="Edit product" description={product.name} />
      <ProductForm
        action={updateProduct.bind(null, id)}
        categories={categories ?? []}
        product={product}
      />
    </>
  );
}
