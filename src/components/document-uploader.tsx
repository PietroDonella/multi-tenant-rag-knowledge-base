"use client";

import { useActionState, useRef, useState } from "react";
import { uploadDocument, type ActionState } from "@/actions/documents";

const initial: ActionState = {};

export function DocumentUploader() {
  const [state, action, pending] = useActionState(uploadDocument, initial);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function takeFile(file: File | undefined) {
    const input = inputRef.current;
    if (!file || !input) return;
    const transfer = new DataTransfer();
    transfer.items.add(file);
    input.files = transfer.files;
    setFileName(file.name);
  }

  return (
    <form action={action} className="rounded-2xl border border-dashed border-[var(--accent)] bg-[var(--panel)] p-6">
      <label
        className={`block cursor-pointer rounded-xl border border-dashed px-4 py-6 text-sm font-medium ${
          dragOver ? "border-[var(--accent)] bg-emerald-50" : "border-[var(--line)]"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          takeFile(event.dataTransfer.files[0]);
        }}
      >
        Arraste um PDF aqui ou escolha do computador
        <input
          ref={inputRef}
          name="file"
          type="file"
          required
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          className="mt-3 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--accent)] file:px-3 file:py-2 file:text-white"
          onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
        />
        {fileName ? <span className="mt-2 block text-xs font-normal text-stone-600">{fileName}</span> : null}
      </label>
      <p className="mt-2 text-xs text-stone-500">
        PDFs com texto são fatiados em trechos e indexados para o chat. Arquivos só de imagem não têm texto extraível.
      </p>
      <button
        type="submit"
        disabled={pending}
        className="mt-4 rounded-lg bg-[var(--ink)] px-4 py-2 text-sm font-medium text-[var(--paper)] disabled:opacity-60"
      >
        {pending ? "Lendo e indexando…" : "Enviar documento"}
      </button>
      {state.error ? <p className="mt-3 text-sm text-[var(--warn)]">{state.error}</p> : null}
      {state.ok ? <p className="mt-3 text-sm text-[var(--accent)]">{state.ok}</p> : null}
    </form>
  );
}
