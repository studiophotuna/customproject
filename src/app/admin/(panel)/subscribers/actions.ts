"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function deleteSubscriber(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("newsletter_subscribers").delete().eq("id", id);
  revalidatePath("/admin/subscribers");
}
