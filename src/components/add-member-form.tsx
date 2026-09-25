"use client";

import { useActionState } from "react";
import { addOrganizationMember } from "@/actions/organizations";
import type { ActionState } from "@/actions/documents";

const initial: ActionState = {};

export function AddMemberForm() {
  const [state, action, pending] = useActionState(addOrganizationMember, initial);

  return (
    <form action={action} className="space-y-2">
      <label className="block text-xs font-medium text-stone-600">
        Adicionar participante
        <input
          name="email"
          type="email"
          required
          placeholder="email@empresa.com"
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "Adicionando…" : "Adicionar"}
      </button>
      {state.error ? <p className="text-xs text-[var(--warn)]">{state.error}</p> : null}
      {state.ok ? <p className="text-xs text-[var(--accent)]">{state.ok}</p> : null}
    </form>
  );
}
