import type { ChatCitation, ChatMessage, Chunk, DocumentRec, Mode } from "@/lib/types";
import { searchChunks } from "@/lib/retrieval/search";
import { getClient, getModel, textOf } from "@/lib/ai/client";

export interface ChatResult {
  answer: string;
  citations: ChatCitation[];
}

function snippet(text: string, max = 260): string {
  const s = text.replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

const SYSTEM =
  "Ti si LTBLaw — hrvatski pravni asistent. Razgovaraš s odvjetnikom o njegovim dokumentima. " +
  "Odgovaraj na hrvatskom, jasno i poslovno, oslanjajući se na priložene izvore iz korisnikovih dokumenata. " +
  "Kada se pozivaš na dokument, navedi članak ili odredbu. Ako odgovor nije u dokumentima, reci to i odgovori na temelju općeg pravnog znanja uz napomenu. " +
  "Ne dajеš obvezujući pravni savjet — odgovor treba provjeriti odvjetnik.";

export async function chatAnswer(opts: {
  question: string;
  history: ChatMessage[];
  chunks: Chunk[];
  docs: DocumentRec[];
  mode: Mode;
  image?: { mediaType: string; data: string };
}): Promise<ChatResult> {
  const { question, history, chunks, docs, mode, image } = opts;
  const titleOf = (id: string) => docs.find((d) => d.id === id)?.title ?? "Dokument";

  const scored = searchChunks(question, chunks, 5);
  const citations: ChatCitation[] = scored.map((s) => ({
    documentTitle: titleOf(s.chunk.documentId),
    heading: s.chunk.heading,
    snippet: snippet(s.chunk.text),
  }));
  const context = scored
    .map((s, i) => `[Izvor ${i + 1}] ${titleOf(s.chunk.documentId)} — ${s.chunk.heading}\n${s.chunk.text}`)
    .join("\n\n");

  if (mode === "live") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await getClient();

      // povijest razgovora (mora počinjati korisnikovom porukom)
      const hist = history.slice(-8);
      while (hist.length && hist[0].role === "assistant") hist.shift();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messages: any[] = hist.map((m) => ({ role: m.role, content: m.text }));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const userContent: any[] = [];
      if (image) {
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: image.mediaType, data: image.data },
        });
      }
      userContent.push({
        type: "text",
        text: `Pitanje: ${question}\n\nDostupni izvori iz dokumenata:\n${context || "(nema pronađenih relevantnih ulomaka)"}`,
      });
      messages.push({ role: "user", content: userContent });

      const resp = await client.messages.create({
        model: getModel(),
        max_tokens: 1024,
        system: SYSTEM,
        messages,
      });
      const out = textOf(resp);
      if (out) return { answer: out, citations };
    } catch {
      /* tihi fallback */
    }
  }

  // DEMO fallback (leksički)
  if (image && citations.length === 0) {
    return { answer: "Za analizu slika potreban je aktivan AI način rada (ANTHROPIC_API_KEY).", citations: [] };
  }
  if (citations.length === 0) {
    return {
      answer:
        "U dostupnim dokumentima nisam pronašao odgovor na to pitanje. Pokušajte preformulirati pitanje ili učitati relevantan dokument.",
      citations: [],
    };
  }
  const top = scored[0];
  return {
    answer: `Na temelju dokumenta „${titleOf(top.chunk.documentId)}”, u dijelu „${top.chunk.heading}” navodi se: ${snippet(top.chunk.text, 360)}`,
    citations,
  };
}
