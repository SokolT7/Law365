import type { Chunk } from "@/lib/types";

/** Uklanja hrvatske dijakritike radi robusnijeg podudaranja (č->c, š->s, ...). */
function deburr(s: string): string {
  return s
    .replace(/č|ć/g, "c")
    .replace(/Č|Ć/g, "c")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/š/g, "s")
    .replace(/Š/g, "s")
    .replace(/ž/g, "z")
    .replace(/Ž/g, "z");
}

const STOP = new Set([
  "i", "u", "na", "za", "se", "je", "su", "od", "do", "the", "a", "o", "s",
  "te", "ili", "ako", "što", "koji", "koja", "koje", "ovaj", "ova", "ovo",
  "ugovor", "ugovora", "ugovoru", "članak", "strana", "strane",
]);

function tokenize(s: string): string[] {
  return deburr(s.toLowerCase())
    .replace(/[^a-z0-9čćđšž\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

export interface ScoredChunk {
  chunk: Chunk;
  score: number;
}

/**
 * Jednostavno leksičko pretraživanje (BM25-ish) preko ulomaka.
 * Dovoljno za kurirani demo-korpus; u produkciji se mijenja embeddingom + pgvector.
 */
export function searchChunks(
  query: string,
  chunks: Chunk[],
  limit = 4
): ScoredChunk[] {
  const terms = tokenize(query);
  if (terms.length === 0) return [];

  const scored: ScoredChunk[] = chunks.map((chunk) => {
    const body = deburr((chunk.heading + " " + chunk.text).toLowerCase());
    const headingBody = deburr(chunk.heading.toLowerCase());
    let score = 0;
    for (const term of terms) {
      const matches = body.split(term).length - 1;
      if (matches > 0) {
        score += matches;
        if (headingBody.includes(term)) score += 2; // naslov nosi veću težinu
      }
    }
    // blaga normalizacija po duljini
    score = score / Math.log2(body.length + 4);
    return { chunk, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
