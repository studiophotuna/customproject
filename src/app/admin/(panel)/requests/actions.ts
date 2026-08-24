"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type RequestStatus = Database["public"]["Enums"]["request_status"];

export async function updateRequestStatus(id: string, status: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("custom_cake_requests")
    .update({ status: status as RequestStatus })
    .eq("id", id);
  revalidatePath("/admin/requests");
}

export async function deleteRequest(id: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("custom_cake_requests").delete().eq("id", id);
  revalidatePath("/admin/requests");
}
