import { notFound, redirect } from "next/navigation";
import { OrganizationForm } from "@/components/organization-form";
import { createClient } from "@/lib/supabase/server";

export default async function EditOrganizationPage({
  params,
}: {
  params: Promise<{ orgId: string }>;
}) {
  const { orgId } = await params;
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

  if (!membership) notFound();
  if (membership.role !== "owner") redirect("/dashboard/profile");

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, description, location, avatar_url, banner_url")
    .eq("id", orgId)
    .maybeSingle();

  if (!organization) notFound();

  return (
    <main className="mx-auto max-w-2xl px-8 py-10">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Editar organização</h1>
      <OrganizationForm
        mode="edit"
        org={{
          id: organization.id,
          name: organization.name,
          description: organization.description,
          location: organization.location,
          avatarUrl: organization.avatar_url,
          bannerUrl: organization.banner_url,
        }}
      />
    </main>
  );
}
