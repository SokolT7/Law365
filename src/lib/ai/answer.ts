import type { Chunk, DocumentRec, Mode } from "@/lib/types";
import { searchChunks, type ScoredChunk } from "@/lib/retrieval/search";
import { corpusChunks, corpusTitle } from "@/lib/corpus";
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
        `[Izvor ${i + 1}] ${titleOf(s.chunk.documentId)} — ${s.chunk.heading}\n${s.chunk.text}`
    )
    .join("\n\n");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = await getClient();
  const msg = await client.messages.create({
    model: getModel(),
    max_tokens: 700,
    thinking: { type: "adaptive" },
    system:
      "Ti si hrvatski pravni asistent. Odgovaraj ISKLJUČIVO na temelju priloženih izvora (dokumenti " +
      "odvjetničkog društva i uključeni izvori prava). Ako odgovor nije u izvorima, reci da podatak nije pronađen — " +
      "ne pretpostavljaj i ne nagađaj. Korisnikovo pitanje može biti nespretno postavljeno: prvo shvati stvarnu namjeru, " +
      "zatim odgovori kratko, na hrvatskom, i u zagradi navedi propis/dokument i članak na koji se pozivaš. " +
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
 * Pitanja i odgovori utemeljeni na dokumentima + uključenim izvorima prava (RAG).
 * Uvijek dohvaća izvore leksičkim pretraživanjem i vraća citate.
 * LIVE način koristi Claudea za formulaciju (uz siguran fallback na DEMO odgovor).
 */
export async function answerQuestion(
  question: string,
  chunks: Chunk[],
  docs: DocumentRec[],
  mode: Mode,
  sources: Record<string, boolean> = { "vasi-dokumenti": true }
): Promise<Answer> {
  const titleOf = (id: string) =>
    corpusTitle(id) ?? docs.find((d) => d.id === id)?.title ?? "Dokument";

  const useDocuments = sources["vasi-dokumenti"] !== false;
  const pool: Chunk[] = [...(useDocuments ? chunks : []), ...corpusChunks(sources)];
  const scored = searchChunks(question, pool, 5);

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
        "U dostupnim izvorima nisam pronašao odgovor na to pitanje. Pokušajte preformulirati pitanje, uključiti dodatne izvore prava ili učitati relevantan ugovor.",
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
  const answer = `Prema izvoru „${titleOf(top.chunk.documentId)}”, u dijelu „${top.chunk.heading}” navodi se: ${snippet(top.chunk.text, 360)}`;
  return { answer, citations };
}
