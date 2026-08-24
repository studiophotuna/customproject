"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadMedia } from "@/lib/admin/media";
import { slugify } from "@/lib/utils";

export type ActionState = { error: string } | null;

function parseProduct(form: FormData) {
  const name = (form.get("name") ?? "").toString().trim();
  const slugInput = (form.get("slug") ?? "").toString().trim();
  return {
    name,
    slug: slugInput ? slugify(slugInput) : slugify(name),
    description: (form.get("description") ?? "").toString().trim() || null,
    price: Number(form.get("price") ?? 0),
    currency: (form.get("currency") ?? "AED").toString().trim() || "AED",
    category_id: (form.get("category_id") ?? "").toString() || null,
    is_new: form.get("is_new") === "on",
    in_stock: form.get("in_stock") === "on",
    featured: form.get("featured") === "on",
    is_active: form.get("is_active") === "on",
    sort_order: Number(form.get("sort_order") ?? 0),
  };
}

export async function createProduct(
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = parseProduct(form);
  if (!data.name || !data.price) {
    return { error: "Name and price are required." };
  }

  const supabase = await createClient();
  let image_url: string | null;
  try {
    image_url = await uploadMedia(supabase, form.get("image") as File | null, "products");
  } catch (e) {
    return { error: (e as Error).message };
  }

  const { error } = await supabase
    .from("products")
    .insert({ ...data, image_url: image_url ?? undefined });
  if (error) {
    return { error: error.code === "23505" ? "That slug is already in use." : error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function updateProduct(
  id: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = parseProduct(form);
  if (!data.name || !data.price) {
    return { error: "Name and price are required." };
  }

  const supabase = await createClient();
  let image_url: string | null;
  try {
    image_url = await uploadMedia(supabase, form.get("image") as File | null, "products");
  } catch (e) {
    return { error: (e as Error).message };
  }

  // Only overwrite the image when a new one was uploaded.
  const patch = image_url ? { ...data, image_url } : data;
  const { error } = await supabase.from("products").update(patch).eq("id", id);
  if (error) {
    return { error: error.code === "23505" ? "That slug is already in use." : error.message };
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function deleteProduct(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("products").delete().eq("id", id);
  revalidatePath("/admin/products");
  revalidatePath("/");
}
