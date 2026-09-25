"use client";

import { deleteOrganization, leaveOrganization } from "@/actions/organizations";

export function MembershipActions({ orgId, role }: { orgId: string; role: "owner" | "admin" | "member" }) {
  if (role === "owner") {
    return (
      <form
        action={deleteOrganization}
        onSubmit={(event) => {
          if (!window.confirm("Apagar esta organização e os documentos dela?")) event.preventDefault();
        }}
      >
        <input type="hidden" name="orgId" value={orgId} />
        <button type="submit" className="text-sm text-[var(--warn)]">
          Apagar
        </button>
      </form>
    );
  }

  return (
    <form
      action={leaveOrganization}
      onSubmit={(event) => {
        if (!window.confirm("Sair desta organização?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="orgId" value={orgId} />
      <button type="submit" className="text-sm text-[var(--warn)]">
        Sair
      </button>
    </form>
  );
}
