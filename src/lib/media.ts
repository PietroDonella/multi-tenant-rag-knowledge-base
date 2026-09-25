import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

type Client = SupabaseClient<Database>;

export async function storeMedia(supabase: Client, file: FormDataEntryValue | null, path: string) {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!file.type.startsWith("image/")) {
    throw new Error("A foto e o banner precisam ser imagens.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const objectPath = `${path}.${extension}`;
  const { error } = await supabase.storage.from("media").upload(objectPath, bytes, {
    contentType: file.type,
    upsert: true,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from("media").getPublicUrl(objectPath);
  return data.publicUrl;
}
