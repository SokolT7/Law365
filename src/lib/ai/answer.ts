import type { Chunk, DocumentRec, Mode } from "@/lib/types";
import { searchChunks, type ScoredChunk } from "@/lib/retrieval/search";
import { getClient, getModel, textOf } from "@/lib/ai/client";

export interface Citation {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  heading: string;
  snippet: string;
}

export interface Answer {
  answer: string;
  citations: Citation[];
}

function snippet(text: string, max = 260): string {
  const s = text.replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

async function answerWithClaude(
  question: string,
  scored: ScoredChunk[],
  titleOf: (id: string) => string
): Promise<string | undefined> {
  const context = scored
    .map(
      (s, i) =>
        `[Izvor ${i + 1}] Dokument: „${titleOf(s.chunk.documentId)}” — ${s.chunk.heading}\n${s.chunk.text}`
    )
    .join("\n\n");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = await getClient();
  const msg = await client.messages.create({
    model: getModel(),
    max_tokens: 700,
    thinking: { type: "adaptive" },
    system:
      "Ti si hrvatski pravni asistent. Odgovaraj ISKLJUČIVO na temelju priloženih izvora iz dokumenata " +
      "odvjetničkog društva. Ako odgovor nije u izvorima, reci da podatak nije pronađen. " +
      "Odgovaraj kratko, na hrvatskom, i u zagradi navedi naziv članka/odredbe na koji se pozivaš. " +
      "Ne daješ pravni savjet — odgovor mora provjeriti odvjetnik.",
    messages: [
      {
        role: "user",
        content: `Pitanje: ${question}\n\nIzvori:\n${context}`,
      },
    ],
  });
  const out = textOf(msg);
  return out || undefined;
}

/**
 * Pitanja i odgovori utemeljeni na dokumentima (RAG).
 * Uvijek dohvaća izvore leksičkim pretraživanjem i vraća citate.
 * LIVE način koristi Claudea za formulaciju (uz siguran fallback na DEMO odgovor).
 */
export async function answerQuestion(
  question: string,
  chunks: Chunk[],
  docs: DocumentRec[],
  mode: Mode
): Promise<Answer> {
  const titleOf = (id: string) => docs.find((d) => d.id === id)?.title ?? "Dokument";
  const scored = searchChunks(question, chunks, 4);

  const citations: Citation[] = scored.map((s) => ({
    documentId: s.chunk.documentId,
    documentTitle: titleOf(s.chunk.documentId),
    chunkId: s.chunk.id,
    heading: s.chunk.heading,
    snippet: snippet(s.chunk.text),
  }));

  if (citations.length === 0) {
    return {
      answer:
        "U dostupnim dokumentima nisam pronašao odgovor na to pitanje. Pokušajte preformulirati pitanje ili učitati relevantan ugovor.",
      citations: [],
    };
  }

  if (mode === "live") {
    try {
      const a = await answerWithClaude(question, scored, titleOf);
      if (a) return { answer: a, citations };
    } catch {
      /* tihi fallback na DEMO odgovor */
    }
  }

  const top = scored[0];
  const answer = `Na temelju dokumenta „${titleOf(top.chunk.documentId)}”, u dijelu „${top.chunk.heading}” navodi se: ${snippet(top.chunk.text, 360)}`;
  return { answer, citations };
}
