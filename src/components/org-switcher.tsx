"use client";

import { setCurrentOrganization } from "@/actions/documents";
import type { Membership } from "@/lib/tenant";

export function OrgSwitcher({
  memberships,
  currentOrgId,
}: {
  memberships: Membership[];
  currentOrgId: string | null;
}) {
  if (memberships.length === 0) {
    return <p className="px-5 text-sm text-emerald-100/70">Nenhuma organização ainda.</p>;
  }

  return (
    <label className="block px-5 text-xs tracking-wide text-emerald-100/70 uppercase">
      Organização atual
      <select
        suppressHydrationWarning
        className="mt-2 w-full rounded-lg border border-white/15 bg-white/10 px-2 py-2 text-sm text-white"
        value={currentOrgId ?? memberships[0].orgId}
        onChange={(event) => {
          void setCurrentOrganization(event.target.value);
        }}
      >
        {memberships.map((membership) => (
          <option key={membership.orgId} value={membership.orgId} className="text-stone-900">
            {membership.name} · {membership.role}
          </option>
        ))}
      </select>
    </label>
  );
}
