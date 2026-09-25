import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  streamText,
  toUIMessageStream,
  type UIMessage,
} from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createClient } from "@/lib/supabase/server";
import { embedText, geminiApiKey } from "@/lib/embeddings";
import { getCurrentOrg } from "@/lib/tenant";
import type { MatchedChunk } from "@/types/supabase";

export const maxDuration = 60;

function lastUserText(messages: UIMessage[]) {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (message.role !== "user") continue;
    return message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n")
      .trim();
  }
  return "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: UIMessage[] };
    const messages = body.messages ?? [];
    const question = lastUserText(messages);

    if (!question) {
      return Response.json({ error: "Envie uma pergunta." }, { status: 400 });
    }

    const org = await getCurrentOrg();
    if (!org) {
      return Response.json(
        { error: "Nenhuma organização ativa. Crie uma no painel antes de conversar." },
        { status: 403 },
      );
    }

    const apiKey = geminiApiKey();
    if (!apiKey) {
      return Response.json(
        { error: "GEMINI_API_KEY não está definida em .env.local." },
        { status: 503 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
    }

    const queryEmbedding = await embedText(question, "RETRIEVAL_QUERY");
    const { data: chunks, error: matchError } = await supabase.rpc("match_document_chunks", {
      query_embedding: `[${queryEmbedding.join(",")}]`,
      match_org_id: org.orgId,
      match_count: 6,
    });

    if (matchError) {
      return Response.json(
        { error: `Busca no acervo falhou: ${matchError.message}` },
        { status: 502 },
      );
    }

    const context = ((chunks ?? []) as MatchedChunk[])
      .map((chunk, index) => `[${index + 1}] ${chunk.content}`)
      .join("\n\n");

    const google = createGoogleGenerativeAI({ apiKey });
    const result = streamText({
      model: google("gemini-2.5-flash"),
      system: [
        `Você é o assistente da organização "${org.name}".`,
        "Responda apenas com base no contexto recuperado do acervo desse tenant.",
        "Se o contexto não bastar, diga que não encontrou a informação nos documentos da organização.",
        "",
        "Contexto:",
        context || "(nenhum trecho encontrado para esta organização)",
      ]
        .filter(Boolean)
        .join("\n"),
      messages: await convertToModelMessages(messages),
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha inesperada no chat.";
    return Response.json({ error: message }, { status: 500 });
  }
}
