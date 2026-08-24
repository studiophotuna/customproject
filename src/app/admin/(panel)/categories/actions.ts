"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { uploadMedia } from "@/lib/admin/media";
import { slugify } from "@/lib/utils";

export type ActionState = { error: string } | null;

function parse(form: FormData) {
  const name = (form.get("name") ?? "").toString().trim();
  const slugInput = (form.get("slug") ?? "").toString().trim();
  return {
    name,
    slug: slugInput ? slugify(slugInput) : slugify(name),
    description: (form.get("description") ?? "").toString().trim() || null,
    sort_order: Number(form.get("sort_order") ?? 0),
    is_active: form.get("is_active") === "on",
  };
}

async function withImage(form: FormData) {
  const supabase = await createClient();
  const image_url = await uploadMedia(supabase, form.get("image") as File | null, "categories");
  return { supabase, image_url };
}

export async function createCategory(_prev: ActionState, form: FormData): Promise<ActionState> {
  const data = parse(form);
  if (!data.name) return { error: "Name is required." };
  try {
    const { supabase, image_url } = await withImage(form);
    const { error } = await supabase
      .from("categories")
      .insert({ ...data, image_url: image_url ?? undefined });
    if (error) return { error: error.code === "23505" ? "Slug already in use." : error.message };
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/categories");
  revalidatePath("/");
  redirect("/admin/categories");
}

export async function updateCategory(
  id: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = parse(form);
  if (!data.name) return { error: "Name is required." };
  try {
    const { supabase, image_url } = await withImage(form);
    const patch = image_url ? { ...data, image_url } : data;
    const { error } = await supabase.from("categories").update(patch).eq("id", id);
    if (error) return { error: error.code === "23505" ? "Slug already in use." : error.message };
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/admin/categories");
  revalidatePath("/");
  redirect("/admin/categories");
}

export async function deleteCategory(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("categories").delete().eq("id", id);
  revalidatePath("/admin/categories");
  revalidatePath("/");
}
