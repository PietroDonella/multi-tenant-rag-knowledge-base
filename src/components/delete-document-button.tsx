"use client";

import { deleteDocument } from "@/actions/documents";

export function DeleteDocumentButton({ documentId }: { documentId: string }) {
  return (
    <form
      action={deleteDocument}
      onSubmit={(event) => {
        if (!window.confirm("Apagar este arquivo do acervo?")) event.preventDefault();
      }}
    >
      <input type="hidden" name="documentId" value={documentId} />
      <button type="submit" className="text-sm text-[var(--warn)]">
        Apagar
      </button>
    </form>
  );
}
