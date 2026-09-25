import Link from "next/link";
import { signOut } from "@/actions/documents";
import { MembershipActions } from "@/components/membership-actions";
import { ProfileEditor } from "@/components/profile-editor";
import { createClient } from "@/lib/supabase/server";
import { getMemberships } from "@/lib/tenant";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const memberships = await getMemberships();

  const { data: profile } = user
    ? await supabase.from("profiles").select("display_name, avatar_url").eq("id", user.id).maybeSingle()
    : { data: null };

  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Usuário";

  return (
    <main className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Perfil</h1>
      <section className="mt-6 flex gap-5 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
        {profile?.avatar_url ? (
          <img src={profile.avatar_url} alt="" className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-ink)] text-2xl text-[var(--paper)]">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xl font-semibold">{displayName}</p>
          <p className="text-sm text-stone-600">{user?.email}</p>
          <ProfileEditor displayName={displayName} avatarUrl={profile?.avatar_url ?? null} />
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-lg font-semibold">Organizações</h2>
        {params.error ? <p className="mt-2 text-sm text-[var(--warn)]">{params.error}</p> : null}
        <ul className="mt-4 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
          {memberships.length === 0 ? (
            <li className="px-5 py-6 text-sm text-stone-500">Você ainda não participa de nenhuma organização.</li>
          ) : (
            memberships.map((membership) => (
              <li key={membership.orgId} className="flex items-center justify-between gap-4 px-5 py-4">
                <div>
                  <p className="font-medium">{membership.name}</p>
                  <p className="text-xs text-stone-500">{membership.role === "owner" ? "Dono" : "Participante"}</p>
                </div>
                <div className="flex items-center gap-4">
                  {membership.role === "owner" ? (
                    <Link
                      href={`/dashboard/organizations/${membership.orgId}/edit`}
                      className="text-sm font-medium text-[var(--accent-ink)]"
                    >
                      Editar
                    </Link>
                  ) : null}
                  <MembershipActions orgId={membership.orgId} role={membership.role} />
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <form action={signOut} className="mt-12">
        <button type="submit" className="rounded-lg border border-[var(--warn)] px-4 py-2 text-sm text-[var(--warn)]">
          Sair da conta
        </button>
      </form>
    </main>
  );
}
