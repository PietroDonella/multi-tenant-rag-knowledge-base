"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { storeMedia } from "@/lib/media";
import { CURRENT_ORG_COOKIE, getCurrentOrg } from "@/lib/tenant";
import type { ActionState } from "@/actions/documents";

function textField(formData: FormData, name: string) {
  const value = String(formData.get(name) ?? "").trim();
  return value.length > 0 ? value : null;
}

async function rememberOrg(orgId: string) {
  const cookieStore = await cookies();
  cookieStore.set(CURRENT_ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function createOrganizationProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const name = textField(formData, "name");
  if (!name) return { error: "Informe o nome da organização." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organizations")
    .insert({
      name,
      description: textField(formData, "description"),
      location: textField(formData, "location"),
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Não foi possível criar a organização." };

  try {
    const avatarUrl = await storeMedia(supabase, formData.get("avatar"), `orgs/${data.id}/avatar`);
    const bannerUrl = await storeMedia(supabase, formData.get("banner"), `orgs/${data.id}/banner`);
    if (avatarUrl || bannerUrl) {
      const { error: updateError } = await supabase
        .from("organizations")
        .update({
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
          ...(bannerUrl ? { banner_url: bannerUrl } : {}),
        })
        .eq("id", data.id);
      if (updateError) return { error: updateError.message };
    }
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Falha ao enviar as imagens.";
    return { error: message };
  }

  await rememberOrg(data.id);
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function updateOrganizationProfile(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const orgId = String(formData.get("orgId") ?? "");
  const name = textField(formData, "name");
  if (!orgId || !name) return { error: "Informe o nome da organização." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("organization_users")
    .select("role")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership?.role !== "owner") return { error: "Somente o dono pode editar a organização." };

  let avatarUrl: string | null = null;
  let bannerUrl: string | null = null;
  try {
    avatarUrl = await storeMedia(supabase, formData.get("avatar"), `orgs/${orgId}/avatar`);
    bannerUrl = await storeMedia(supabase, formData.get("banner"), `orgs/${orgId}/banner`);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Falha ao enviar as imagens.";
    return { error: message };
  }

  const { error } = await supabase
    .from("organizations")
    .update({
      name,
      description: textField(formData, "description"),
      location: textField(formData, "location"),
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
      ...(bannerUrl ? { banner_url: bannerUrl } : {}),
    })
    .eq("id", orgId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/profile");
  redirect("/dashboard/profile");
}

export async function addOrganizationMember(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const org = await getCurrentOrg();
  if (!org) return { error: "Selecione uma organização." };
  if (org.role !== "owner") return { error: "Somente o dono pode adicionar participantes." };
  if (!email) return { error: "Informe o e-mail de quem já tem conta." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_organization_member", {
    target_org: org.orgId,
    member_email: email,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  return { ok: `${email} entrou em ${org.name}.` };
}

export async function leaveOrganization(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !orgId) redirect("/dashboard/profile");

  const { error } = await supabase
    .from("organization_users")
    .delete()
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .neq("role", "owner");

  if (error) redirect(`/dashboard/profile?error=${encodeURIComponent(error.message)}`);

  const cookieStore = await cookies();
  if (cookieStore.get(CURRENT_ORG_COOKIE)?.value === orgId) {
    cookieStore.delete(CURRENT_ORG_COOKIE);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard/profile");
}

export async function deleteOrganization(formData: FormData) {
  const orgId = String(formData.get("orgId") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !orgId) redirect("/dashboard/profile");

  const { data: documents } = await supabase
    .from("documents")
    .select("file_url")
    .eq("org_id", orgId);

  const { error } = await supabase.from("organizations").delete().eq("id", orgId);
  if (error) redirect(`/dashboard/profile?error=${encodeURIComponent(error.message)}`);

  const paths = (documents ?? []).map((document) => document.file_url).filter(Boolean);
  if (paths.length > 0) {
    await supabase.storage.from("documents").remove(paths);
  }

  const cookieStore = await cookies();
  if (cookieStore.get(CURRENT_ORG_COOKIE)?.value === orgId) {
    cookieStore.delete(CURRENT_ORG_COOKIE);
  }

  revalidatePath("/dashboard");
  redirect("/dashboard/profile");
}
