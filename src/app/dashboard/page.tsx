import { AddMemberForm } from "@/components/add-member-form";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/tenant";
import Link from "next/link";

type MemberProfile = { display_name: string | null; avatar_url: string | null };

export default async function DashboardPage() {
  const org = await getCurrentOrg();
  if (!org) {
    return (
      <main className="mx-auto max-w-3xl px-8 py-10">
        <h1 className="text-3xl font-semibold">Nenhuma organização selecionada</h1>
        <p className="mt-3 text-stone-600">Crie a primeira organização para montar o acervo.</p>
        <Link href="/dashboard/organizations/new" className="mt-6 inline-block text-sm font-semibold text-[var(--accent)]">
          Nova organização
        </Link>
      </main>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, description, location, avatar_url, banner_url")
    .eq("id", org.orgId)
    .maybeSingle();

  const { data: memberships } = await supabase
    .from("organization_users")
    .select("user_id, role, profiles(display_name, avatar_url)")
    .eq("org_id", org.orgId);

  const members = (memberships ?? []).map((row) => {
    const profile = row.profiles as MemberProfile | MemberProfile[] | null;
    const resolved = Array.isArray(profile) ? profile[0] : profile;
    return {
      userId: row.user_id,
      role: row.role,
      name: resolved?.display_name || "Participante",
      avatarUrl: resolved?.avatar_url ?? null,
    };
  });

  const isOwner = org.role === "owner";
  const initial = organization?.name.slice(0, 1).toUpperCase() ?? "O";

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="border-b border-[var(--line)] bg-[var(--panel)] px-5 py-8 lg:border-r lg:border-b-0">
        <h2 className="text-sm font-semibold tracking-wide text-stone-500 uppercase">Participantes</h2>
        {members.length === 0 && isOwner ? (
          <div className="mt-4">
            <AddMemberForm />
          </div>
        ) : null}
        <ul className="mt-4 space-y-3">
          {members.map((member) => (
            <li key={member.userId} className="flex items-center gap-3">
              {member.avatarUrl ? (
                <img src={member.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-ink)] text-sm text-[var(--paper)]">
                  {member.name.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div>
                <p className="text-sm font-medium">
                  {member.name}
                  {member.userId === user?.id ? " (você)" : ""}
                </p>
                <p className="text-xs text-stone-500">{member.role === "owner" ? "Dono" : "Participante"}</p>
              </div>
            </li>
          ))}
        </ul>
        {members.length > 0 && isOwner ? (
          <div className="mt-6 border-t border-[var(--line)] pt-4">
            <AddMemberForm />
          </div>
        ) : null}
      </aside>
      <main className="px-6 py-8 lg:px-10">
        <article className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--panel)]">
          <div
            className="h-44 bg-[var(--accent-ink)] bg-cover bg-center"
            style={organization?.banner_url ? { backgroundImage: `url(${organization.banner_url})` } : undefined}
          />
          <div className="flex items-end justify-between gap-6 px-8">
            <div className="pb-2">
              <h1 className="text-3xl font-semibold tracking-tight">{organization?.name ?? org.name}</h1>
              {organization?.location ? (
                <p className="mt-1 text-sm text-stone-500/80">{organization.location}</p>
              ) : null}
            </div>
            {organization?.avatar_url ? (
              <img
                src={organization.avatar_url}
                alt=""
                className="-mt-14 h-28 w-28 rounded-full border-4 border-[var(--panel)] object-cover"
              />
            ) : (
              <span className="-mt-14 flex h-28 w-28 items-center justify-center rounded-full border-4 border-[var(--panel)] bg-[var(--accent)] text-3xl text-white">
                {initial}
              </span>
            )}
          </div>
          <p className="px-8 py-8 text-center text-stone-700">
            {organization?.description || "Esta organização ainda não tem descrição."}
          </p>
        </article>
      </main>
    </div>
  );
}
