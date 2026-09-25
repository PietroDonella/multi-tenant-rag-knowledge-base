"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { storeMedia } from "@/lib/media";
import type { ActionState } from "@/actions/documents";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!displayName) return { error: "Informe seu nome." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let avatarUrl: string | null = null;
  try {
    avatarUrl = await storeMedia(supabase, formData.get("avatar"), `users/${user.id}/avatar`);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Falha ao enviar a foto.";
    return { error: message };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };
  revalidatePath("/dashboard/profile");
  return { ok: "Perfil atualizado." };
}
