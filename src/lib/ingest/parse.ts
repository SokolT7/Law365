/**
 * Pretvara učitanu datoteku u čisti tekst.
 * Podržava .txt / .md (izravno), .docx (mammoth) i .pdf (pdf-parse).
 * Parseri se učitavaju lijeno (dynamic import) i kvarovi se elegantno hvataju.
 */
export async function parseFile(
  filename: string,
  buffer: Buffer
): Promise<string> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".txt") || lower.endsWith(".md")) {
    return buffer.toString("utf8");
  }

  if (lower.endsWith(".docx")) {
    try {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch {
      throw new Error(
        "Nije moguće pročitati .docx datoteku. Pokušajte s .txt ili .pdf."
      );
    }
  }

  if (lower.endsWith(".pdf")) {
    try {
      // Uvozi se interna datoteka biblioteke kako bi se izbjegao njezin debug kod.
      const mod = await import("pdf-parse/lib/pdf-parse.js");
      const pdf = (mod as { default?: (b: Buffer) => Promise<{ text: string }> })
        .default ?? (mod as unknown as (b: Buffer) => Promise<{ text: string }>);
      const data = await pdf(buffer);
      return data.text;
    } catch {
      throw new Error(
        "Nije moguće pročitati .pdf datoteku. Pokušajte s .txt ili .docx."
      );
    }
  }

  // Posljednja opcija: pokušaj kao običan tekst
  return buffer.toString("utf8");
}

export function isSupported(filename: string): boolean {
  return /\.(txt|md|docx|pdf)$/i.test(filename);
}
