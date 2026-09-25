import { OrganizationForm } from "@/components/organization-form";

export default function NewOrganizationPage() {
  return (
    <main className="mx-auto max-w-2xl px-8 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Nova organização</h1>
      <p className="mt-2 mb-6 text-sm text-stone-600">
        Foto, banner e descrição aparecem na visão geral. O local é opcional.
      </p>
      <OrganizationForm mode="create" />
    </main>
  );
}
