import { extractText, getDocumentProxy } from "unpdf";

export async function extractPdfText(data: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(data);
  const { text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];

  return pages
    .map((page, index) => {
      const body = String(page ?? "").trim();
      if (!body) return "";
      return `[Página ${index + 1}]\n${body}`;
    })
    .filter(Boolean)
    .join("\n\n");
}
