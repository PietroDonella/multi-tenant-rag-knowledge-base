import Link from "next/link";
import { OrgSwitcher } from "@/components/org-switcher";
import { SidebarNav } from "@/components/sidebar-nav";
import { getMemberships, type Membership } from "@/lib/tenant";

export async function Sidebar({ current }: { current: Membership | null }) {
  const memberships = await getMemberships();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--line)] bg-[var(--accent-ink)] text-[#f4efe6]">
      <div className="px-5 py-6">
        <p className="text-xs tracking-[0.2em] uppercase text-emerald-200/80">Acervo</p>
        <p className="mt-1 text-lg font-semibold">Knowledge base</p>
      </div>
      <Link
        href="/dashboard/organizations/new"
        className="mx-3 rounded-2xl border border-[#efe6d6] bg-[#f7f1e7] px-3 py-2 text-center text-sm font-medium text-[var(--ink)] hover:bg-white"
      >
        Nova organização
      </Link>
      <div className="mt-4 border-t border-white/10 pt-4">
        <OrgSwitcher memberships={memberships} currentOrgId={current?.orgId ?? null} />
        <SidebarNav />
      </div>
      <Link
        href="/dashboard/profile"
        className="mx-3 mt-auto mb-4 rounded-2xl border border-[#efe6d6] bg-[#f7f1e7] px-3 py-2 text-center text-sm text-[var(--ink)] hover:bg-white"
      >
        Perfil
      </Link>
    </aside>
  );
}
