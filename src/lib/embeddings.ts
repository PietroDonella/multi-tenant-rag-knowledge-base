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
  const { embeddings } = await embedMany({
    model: google.embedding(EMBEDDING_MODEL),
    values,
    maxParallelCalls: 3,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType: task,
      },
    },
  });

  return embeddings.map((embedding) => {
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(`Embedding inesperado: ${embedding.length} dimensões.`);
    }
    return normalize(embedding);
  });
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
