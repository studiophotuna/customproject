"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type OrderStatus = Database["public"]["Enums"]["order_status"];

export async function updateOrderStatus(id: string, status: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("orders")
    .update({ status: status as OrderStatus })
    .eq("id", id);
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${id}`);
}
