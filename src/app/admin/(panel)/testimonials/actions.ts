"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState = { error: string } | null;

function parse(form: FormData) {
  return {
    author: (form.get("author") ?? "").toString().trim(),
    rating: Math.min(5, Math.max(1, Number(form.get("rating") ?? 5))),
    content: (form.get("content") ?? "").toString().trim(),
    sort_order: Number(form.get("sort_order") ?? 0),
    is_active: form.get("is_active") === "on",
  };
}

export async function createTestimonial(_prev: ActionState, form: FormData): Promise<ActionState> {
  const data = parse(form);
  if (!data.author || !data.content) return { error: "Author and content are required." };
  const supabase = await createClient();
  const { error } = await supabase.from("testimonials").insert(data);
  if (error) return { error: error.message };
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  redirect("/admin/testimonials");
}

export async function updateTestimonial(
  id: string,
  _prev: ActionState,
  form: FormData,
): Promise<ActionState> {
  const data = parse(form);
  if (!data.author || !data.content) return { error: "Author and content are required." };
  const supabase = await createClient();
  const { error } = await supabase.from("testimonials").update(data).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  redirect("/admin/testimonials");
}

export async function deleteTestimonial(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("testimonials").delete().eq("id", id);
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
}
