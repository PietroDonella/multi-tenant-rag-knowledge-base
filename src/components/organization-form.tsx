"use client";

import { useActionState } from "react";
import { createOrganizationProfile, updateOrganizationProfile } from "@/actions/organizations";
import { ImagePicker } from "@/components/image-picker";
import type { ActionState } from "@/actions/documents";

const initial: ActionState = {};

export function OrganizationForm({
  mode,
  org,
}: {
  mode: "create" | "edit";
  org?: {
    id: string;
    name: string;
    description: string | null;
    location: string | null;
    avatarUrl: string | null;
    bannerUrl: string | null;
  };
}) {
  const action = mode === "create" ? createOrganizationProfile : updateOrganizationProfile;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="space-y-4 rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6">
      {org ? <input type="hidden" name="orgId" value={org.id} /> : null}
      <label className="block text-sm font-medium">
        Nome
        <input
          name="name"
          required
          defaultValue={org?.name ?? ""}
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm font-medium">
        Descrição
        <textarea
          name="description"
          rows={4}
          defaultValue={org?.description ?? ""}
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
        />
      </label>
      <label className="block text-sm font-medium">
        Local <span className="font-normal text-stone-500">(opcional)</span>
        <input
          name="location"
          defaultValue={org?.location ?? ""}
          className="mt-1 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
        />
      </label>
      <ImagePicker name="avatar" label="Foto" shape="circle" initialUrl={org?.avatarUrl} />
      <ImagePicker name="banner" label="Banner" shape="banner" initialUrl={org?.bannerUrl} />
      {state.error ? <p className="text-sm text-[var(--warn)]">{state.error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-[var(--accent)] px-4 py-2 font-medium text-white disabled:opacity-60"
      >
        {pending ? "Salvando…" : mode === "create" ? "Criar organização" : "Salvar alterações"}
      </button>
    </form>
  );
}
