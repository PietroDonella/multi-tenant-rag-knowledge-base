"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/chunk-text";
import { embedTexts } from "@/lib/embeddings";
import { extractPdfText } from "@/lib/extract-pdf";
import { CURRENT_ORG_COOKIE, getCurrentOrg } from "@/lib/tenant";

export type ActionState = { error?: string; ok?: string };

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  redirect(next.startsWith("/") ? next : "/dashboard");
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { error: error.message };
  return { ok: "Conta criada. Confirme o e-mail se o projeto exigir confirmação, depois entre." };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function createOrganization(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Informe o nome da organização." };

  const supabase = await createClient();
  const { data, error } = await supabase.from("organizations").insert({ name }).select("id").single();
  if (error || !data) return { error: error?.message ?? "Não foi possível criar a organização." };

  const cookieStore = await cookies();
  cookieStore.set(CURRENT_ORG_COOKIE, data.id, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function setCurrentOrganization(orgId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("organization_users")
    .select("org_id")
    .eq("org_id", orgId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Você não pertence a esta organização.");
  }

  const cookieStore = await cookies();
  cookieStore.set(CURRENT_ORG_COOKIE, orgId, { httpOnly: true, sameSite: "lax", path: "/" });
  revalidatePath("/dashboard");
}

export async function uploadDocument(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo." };
  }

  const org = await getCurrentOrg();
  if (!org) return { error: "Crie ou selecione uma organização antes de enviar arquivos." };

  const supabase = await createClient();
  const documentId = crypto.randomUUID();
  const safeName = file.name.replace(/[^\w.\-]+/g, "_");
  const storagePath = `${org.orgId}/${documentId}/${safeName}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const isPdf = file.type === "application/pdf" || safeName.toLowerCase().endsWith(".pdf");
  const isText = file.type.startsWith("text/") || /\.(txt|md)$/i.test(safeName);
  if (!isPdf && !isText) {
    return { error: "Envie um PDF, TXT ou Markdown." };
  }

  let rawText = "";
  try {
    rawText = isPdf ? await extractPdfText(bytes) : new TextDecoder().decode(bytes);
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha ao ler o arquivo";
    return { error: `Não consegui ler o PDF: ${message}` };
  }

  const { chunks, truncated } = chunkText(rawText);
  if (chunks.length === 0) {
    return {
      error: "Não encontrei texto neste arquivo. PDFs feitos só de imagem precisam de OCR.",
    };
  }

  let embeddings: number[][];
  try {
    embeddings = await embedTexts(chunks, "RETRIEVAL_DOCUMENT");
    if (embeddings.length !== chunks.length) {
      return { error: "O Gemini devolveu menos embeddings do que os trechos do arquivo." };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha ao gerar embeddings";
    return { error: `Análise interrompida: ${message}` };
  }

  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, bytes, {
    contentType: file.type || (isPdf ? "application/pdf" : "text/plain"),
    upsert: false,
  });
  if (uploadError) return { error: `Storage: ${uploadError.message}` };

  const { error: insertError } = await supabase.from("documents").insert({
    id: documentId,
    org_id: org.orgId,
    filename: file.name,
    file_url: storagePath,
  });
  if (insertError) return { error: `Metadados: ${insertError.message}` };

  const { error: chunkError } = await supabase.from("document_chunks").insert(
    chunks.map((content, index) => ({
      document_id: documentId,
      org_id: org.orgId,
      content,
      embedding: `[${embeddings[index]?.join(",") ?? ""}]`,
    })),
  );
  if (chunkError) {
    await supabase.from("documents").delete().eq("id", documentId).eq("org_id", org.orgId);
    return { error: `Trechos não foram salvos: ${chunkError.message}` };
  }

  revalidatePath("/dashboard/documents");
  const limitNote = truncated ? " O arquivo passou do limite de 40 trechos; o restante não entrou no acervo." : "";
  const trechos = chunks.length === 1 ? "1 trecho" : `${chunks.length} trechos`;
  return { ok: `${file.name} analisado em ${trechos}.${limitNote}` };
}

export async function deleteDocument(formData: FormData) {
  const documentId = String(formData.get("documentId") ?? "");
  const org = await getCurrentOrg();
  if (!org || !documentId) return;

  const supabase = await createClient();
  const { data: document } = await supabase
    .from("documents")
    .select("id, file_url")
    .eq("id", documentId)
    .eq("org_id", org.orgId)
    .maybeSingle();

  if (!document) return;

  const { error } = await supabase.from("documents").delete().eq("id", document.id).eq("org_id", org.orgId);
  if (error) return;

  if (document.file_url) {
    await supabase.storage.from("documents").remove([document.file_url]);
  }

  revalidatePath("/dashboard/documents");
}
