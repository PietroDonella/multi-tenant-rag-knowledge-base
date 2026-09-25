import { DeleteDocumentButton } from "@/components/delete-document-button";
import { DocumentUploader } from "@/components/document-uploader";
import { createClient } from "@/lib/supabase/server";
import { getCurrentOrg } from "@/lib/tenant";

export const maxDuration = 300;

export default async function DocumentsPage() {
  const org = await getCurrentOrg();
  const supabase = await createClient();

  const { data: documents, error } = org
    ? await supabase
        .from("documents")
        .select("id, filename, created_at, org_id")
        .eq("org_id", org.orgId)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  return (
    <main className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Documentos</h1>
      <div className="mt-6">
        <DocumentUploader />
      </div>
      {error ? <p className="mt-4 text-sm text-[var(--warn)]">{error.message}</p> : null}
      <ul className="mt-8 divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--panel)]">
        {(documents ?? []).length === 0 ? (
          <li className="px-5 py-8 text-sm text-stone-500">Nenhum arquivo neste tenant.</li>
        ) : (
          documents?.map((document) => (
            <li key={document.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <span className="font-medium">{document.filename}</span>
              <div className="flex items-center gap-4">
                <time className="text-xs text-stone-500">
                  {new Date(document.created_at).toLocaleString("pt-BR")}
                </time>
                <DeleteDocumentButton documentId={document.id} />
              </div>
            </li>
          ))
        )}
      </ul>
    </main>
  );
}
