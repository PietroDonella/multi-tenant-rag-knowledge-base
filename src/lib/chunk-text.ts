const TARGET_CHARS = 1200;
const OVERLAP_CHARS = 180;
const MAX_CHUNKS = 40;

/** Splits document text into overlapping passages sized for the embedding model. */
export function chunkText(input: string): { chunks: string[]; truncated: boolean } {
  const normalized = input
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) return { chunks: [], truncated: false };

  const chunks: string[] = [];
  let truncated = false;
  const paragraphs = normalized.split(/\n{2,}/);
  let current = "";

  const push = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed || chunks.length >= MAX_CHUNKS) return;
    chunks.push(trimmed);
  };

  for (const paragraph of paragraphs) {
    if (chunks.length >= MAX_CHUNKS) {
      truncated = true;
      break;
    }

    const combined = current ? `${current}\n\n${paragraph}` : paragraph;
    if (combined.length <= TARGET_CHARS) {
      current = combined;
      continue;
    }

    if (current) push(current);
    current = "";

    if (paragraph.length <= TARGET_CHARS) {
      current = overlapPrefix(chunks, paragraph);
      continue;
    }

    let start = 0;
    while (start < paragraph.length && chunks.length < MAX_CHUNKS) {
      const end = Math.min(start + TARGET_CHARS, paragraph.length);
      push(paragraph.slice(start, end));
      if (end >= paragraph.length) break;
      start = Math.max(0, end - OVERLAP_CHARS);
      if (chunks.length >= MAX_CHUNKS && start < paragraph.length) truncated = true;
    }
  }

  if (current) push(current);
  if (chunks.length >= MAX_CHUNKS && current.length > TARGET_CHARS) truncated = true;
  return { chunks, truncated };
}

function overlapPrefix(chunks: string[], next: string) {
  const previous = chunks.at(-1);
  if (!previous) return next;
  const tail = previous.slice(-OVERLAP_CHARS).trim();
  if (!tail || next.startsWith(tail)) return next;
  const prefixed = `${tail}\n${next}`;
  return prefixed.length <= TARGET_CHARS ? prefixed : next;
}

export const chunkLimit = MAX_CHUNKS;
