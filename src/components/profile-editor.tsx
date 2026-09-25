"use client";

import { useActionState } from "react";
import { updateProfile } from "@/actions/profile";
import type { ActionState } from "@/actions/documents";

const initial: ActionState = {};

export function ProfileEditor({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl: string | null;
}) {
  const [state, action, pending] = useActionState(updateProfile, initial);

  return (
    <form action={action} className="mt-4 space-y-3">
      <label className="block text-sm font-medium">
        Nome
        <input
          name="displayName"
          required
          defaultValue={displayName}
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm font-medium">
        Foto
        <input name="avatar" type="file" accept="image/*" className="mt-1 block w-full text-sm" />
      </label>
      {avatarUrl ? <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover" /> : null}
      {state.error ? <p className="text-sm text-[var(--warn)]">{state.error}</p> : null}
      {state.ok ? <p className="text-sm text-[var(--accent)]">{state.ok}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--ink)] px-3 py-2 text-sm text-[var(--paper)] disabled:opacity-60"
      >
        {pending ? "Salvando…" : "Salvar perfil"}
      </button>
    </form>
  );
}
