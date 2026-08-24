import { createClient } from "@/lib/supabase/server";
import { AdminHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { createProduct } from "../actions";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("sort_order");

  return (
    <>
      <AdminHeader title="New product" />
      <ProductForm action={createProduct} categories={categories ?? []} />
    </>
  );
}
