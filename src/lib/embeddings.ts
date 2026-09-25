const EMBEDDING_DIMENSIONS = 1536;
const EMBEDDING_MODEL = "gemini-embedding-001";

export type EmbedTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

export function geminiApiKey() {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY ?? "";
}

/**
 * Gemini embedding (gemini-embedding-001), truncated to 1536 dimensions to
 * match document_chunks.embedding. Truncated vectors from this model must be
 * normalized before cosine distance.
 */
export async function embedTexts(values: string[], task: EmbedTask): Promise<number[][]> {
  const apiKey = geminiApiKey();
  if (!apiKey) {
    throw new Error("Defina GEMINI_API_KEY em .env.local.");
  }
  if (values.length === 0) return [];

  const { embedMany } = await import("ai");
  const { createGoogleGenerativeAI } = await import("@ai-sdk/google");
  const google = createGoogleGenerativeAI({ apiKey });
  const batchSize = 16;
  const vectors: number[][] = [];

  for (let start = 0; start < values.length; start += batchSize) {
    const batch = values.slice(start, start + batchSize);
    const { embeddings } = await embedMany({
      model: google.embedding(EMBEDDING_MODEL),
      values: batch,
      maxParallelCalls: 2,
      providerOptions: {
        google: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
          taskType: task,
        },
      },
    });

    if (embeddings.length !== batch.length) {
      throw new Error("O Gemini devolveu menos embeddings do que os trechos enviados.");
    }

    for (const embedding of embeddings) {
      if (embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Embedding inesperado: ${embedding.length} dimensões.`);
      }
      vectors.push(normalize(embedding));
    }
  }

  return vectors;
}

export async function embedText(value: string, task: EmbedTask): Promise<number[]> {
  const [embedding] = await embedTexts([value], task);
  if (!embedding) throw new Error("O Gemini não retornou embedding.");
  return embedding;
}

function normalize(vector: number[]) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}
