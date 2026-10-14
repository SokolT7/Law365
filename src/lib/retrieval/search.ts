import type { Chunk } from "@/lib/types";
import { fold, synonyms, terms } from "@/lib/legal/text";

export interface ScoredChunk {
  chunk: Chunk;
  score: number;
}

/**
 * Lexical search over firm document chunks (BM25-style term frequency, length-normalised),
 * using the same Croatian stemming and legal synonyms as the legal store.
 */
export function searchChunks(query: string, chunks: Chunk[], limit = 4): ScoredChunk[] {
  const qTerms = terms(query);
  if (qTerms.length === 0) return [];
  const df = new Map<string, number>();
  const bodies = chunks.map((chunk) => {
    const body = fold(`${chunk.heading} ${chunk.text}`);
    for (const t of qTerms) if ([t, ...synonyms(t)].some((x) => body.includes(x))) df.set(t, (df.get(t) ?? 0) + 1);
    return { chunk, body, heading: fold(chunk.heading) };
  });
  const n = Math.max(1, chunks.length);
  const scored = bodies.map(({ chunk, body, heading }) => {
    let score = 0;
    let covered = 0;
    for (const t of qTerms) {
      const variants = [t, ...synonyms(t)];
      const tf = variants.reduce((sum, v) => sum + (body.split(v).length - 1), 0);
      if (!tf) continue;
      covered++;
      const idf = Math.log(1 + (n - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
      score += idf * ((tf * 2.2) / (tf + 1.2)) + (variants.some((v) => heading.includes(v)) ? idf : 0);
    }
    score *= 0.4 + covered / qTerms.length;
    return { chunk, score: score / Math.log2(body.length / 400 + 2) };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}
