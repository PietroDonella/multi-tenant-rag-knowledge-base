"use client";

import { useActionState } from "react";
import { createOrganization, type ActionState } from "@/actions/documents";

const initial: ActionState = {};

export function CreateOrgForm({
  action = createOrganization,
}: {
  action?: typeof createOrganization;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="mt-3 flex gap-2">
      <input
        name="name"
        required
        placeholder="Nome da empresa"
        className="min-w-0 flex-1 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {pending ? "…" : "Criar"}
      </button>
      {state.error ? <p className="sr-only">{state.error}</p> : null}
      {state.error ? <p className="absolute mt-12 text-xs text-[var(--warn)]">{state.error}</p> : null}
    </form>
  );
}
