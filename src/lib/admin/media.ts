import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { slugify } from "@/lib/utils";

/**
 * Upload an image File to the public "media" bucket and return its public URL.
 * Returns null if no file was provided (empty file input). Throws on error.
 */
export async function uploadMedia(
  supabase: SupabaseClient<Database>,
  file: File | null,
  folder: string,
): Promise<string | null> {
  if (!file || file.size === 0) return null;

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const base = slugify(file.name.replace(/\.[^.]+$/, "")) || "image";
  const path = `${folder}/${Date.now()}-${base}.${ext}`;

  const { error } = await supabase.storage.from("media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type || undefined,
  });
  if (error) throw new Error(`Image upload failed: ${error.message}`);

  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}
