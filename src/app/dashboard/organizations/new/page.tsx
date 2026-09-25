import { OrganizationForm } from "@/components/organization-form";

export default function NewOrganizationPage() {
  return (
    <main className="mx-auto max-w-2xl px-8 py-10">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Nova organização</h1>
      <OrganizationForm mode="create" />
    </main>
  );
}
