import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const CURRENT_ORG_COOKIE = "current_org_id";

export type Membership = {
  orgId: string;
  name: string;
  role: "owner" | "admin" | "member";
};

export async function getMemberships(): Promise<Membership[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("organization_users")
    .select("org_id, role, organizations(name)")
    .eq("user_id", user.id);

  if (error || !data) return [];

  return data.map((row) => {
    const organization = row.organizations as { name: string } | { name: string }[] | null;
    const name = Array.isArray(organization) ? organization[0]?.name : organization?.name;
    return {
      orgId: row.org_id,
      name: name ?? "Organização",
      role: row.role,
    };
  });
}

/** Tenant selected by the signed-in user. Falls back to their first membership. */
export async function getCurrentOrg(): Promise<Membership | null> {
  const memberships = await getMemberships();
  if (memberships.length === 0) return null;

  const cookieStore = await cookies();
  const selected = cookieStore.get(CURRENT_ORG_COOKIE)?.value;
  return memberships.find((membership) => membership.orgId === selected) ?? memberships[0];
}
