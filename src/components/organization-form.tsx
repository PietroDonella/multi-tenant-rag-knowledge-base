"use client";

import { useActionState, useState } from "react";
import { createOrganizationProfile, updateOrganizationProfile } from "@/actions/organizations";
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
  const [avatarPreview, setAvatarPreview] = useState(org?.avatarUrl ?? "");
  const [bannerPreview, setBannerPreview] = useState(org?.bannerUrl ?? "");

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
      <ImageField label="Foto" name="avatar" preview={avatarPreview} onPreview={setAvatarPreview} />
      <ImageField label="Banner" name="banner" preview={bannerPreview} onPreview={setBannerPreview} />
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

function ImageField({
  label,
  name,
  preview,
  onPreview,
}: {
  label: string;
  name: string;
  preview: string;
  onPreview: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        name={name}
        type="file"
        accept="image/*"
        className="mt-1 block w-full text-sm"
        onChange={(event) => {
          const file = event.target.files?.[0];
          onPreview(file ? URL.createObjectURL(file) : "");
        }}
      />
      {preview ? (
        <img src={preview} alt="" className="mt-2 h-24 w-full rounded-lg object-cover" />
      ) : null}
    </label>
  );
}
