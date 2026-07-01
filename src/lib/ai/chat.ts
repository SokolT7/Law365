import type { ChatCitation, ChatMessage, Chunk, DocumentRec, Mode } from "@/lib/types";
import { searchChunks } from "@/lib/retrieval/search";
import { corpusChunks, corpusTitle } from "@/lib/corpus";
import { getClient, getModel, textOf } from "@/lib/ai/client";

export interface ChatResult {
  answer: string;
  citations: ChatCitation[];
}

function snippet(text: string, max = 260): string {
  const s = text.replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max - 1) + "…" : s;
}

/** Stroga, ne-pretpostavljajuća uloga: odgovara isključivo iz priloženih izvora. */
const SYSTEM = [
  "Ti si LTBLaw — hrvatski pravni asistent koji pomaže odvjetniku oko njegovih dokumenata.",
  "STROGA PRAVILA (obvezno):",
  "1. Odgovaraj ISKLJUČIVO na temelju priloženih izvora (ulomaka iz korisnikovih dokumenata i uključenih izvora prava). Ne koristi vanjsko znanje, ne pretpostavljaj i ne izmišljaj.",
  "2. Ako odgovor nije sadržan u priloženim izvorima, jasno reci: „To nije navedeno u dostupnim izvorima.” i ne nagađaj.",
  "3. Nikada ne donosi odluke umjesto korisnika i ne daj obvezujući pravni savjet — iznosi samo ono što piše u izvorima i predloži da provjeri odvjetnik.",
  "4. Za svaku tvrdnju navedi izvor (naziv dokumenta/propisa i članak/odredbu).",
  "5. Odgovaraj na hrvatskom jeziku, kratko i jasno.",
].join("\n");

/** Omata (možda loše postavljeno) korisničko pitanje u jasne upute za model. */
function scaffold(question: string, context: string): string {
  return [
    `Korisnik je postavio pitanje (može biti nejasno, nepotpuno ili kolokvijalno): "${question}"`,
    "",
    "Postupi ovako:",
    "1. Razumij stvarnu namjeru korisnika i u sebi preoblikuj pitanje u jasno pravno pitanje.",
    "2. Odgovori ISKLJUČIVO na temelju dolje navedenih izvora. Ako u izvorima nema odgovora, reci da nije navedeno u dostupnim izvorima i ne nagađaj.",
    "3. Navedi izvor (dokument/propis + članak/odredba) za svaku tvrdnju.",
    "",
    "Izvori:",
    context || "(nema relevantnih izvora za ovo pitanje)",
  ].join("\n");
}

export async function chatAnswer(opts: {
  question: string;
  history: ChatMessage[];
  chunks: Chunk[];
  docs: DocumentRec[];
  mode: Mode;
  sources: Record<string, boolean>;
  image?: { mediaType: string; data: string };
}): Promise<ChatResult> {
  const { question, history, chunks, docs, mode, sources, image } = opts;
  const titleOf = (id: string) =>
    corpusTitle(id) ?? docs.find((d) => d.id === id)?.title ?? "Dokument";

  const useDocuments = sources["vasi-dokumenti"] !== false;
  const anySourceOn = useDocuments || Object.values(sources).some(Boolean);

  // spoji dokumentne ulomke (ako su uključeni) s korpusom uključenih izvora prava
  const pool: Chunk[] = [
    ...(useDocuments ? chunks : []),
    ...corpusChunks(sources),
  ];
  const scored = pool.length > 0 ? searchChunks(question, pool, 6) : [];
  const citations: ChatCitation[] = scored.map((s) => ({
    documentTitle: titleOf(s.chunk.documentId),
    heading: s.chunk.heading,
    snippet: snippet(s.chunk.text),
  }));
  const context = scored
    .map((s, i) => `[Izvor ${i + 1}] ${titleOf(s.chunk.documentId)} — ${s.chunk.heading}\n${s.chunk.text}`)
    .join("\n\n");

  if (mode === "live" && anySourceOn) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const client: any = await getClient();
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
      userContent.push({ type: "text", text: scaffold(question, context) });
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

  // DEMO fallback (leksički, jednako strog)
  if (!anySourceOn) {
    return {
      answer:
        "Nijedan izvor nije uključen. Uključite „Vaši dokumenti” ili neki od izvora prava da bih mogao odgovoriti.",
      citations: [],
    };
  }
  if (image && citations.length === 0) {
    return { answer: "Za analizu slika potreban je aktivan AI način rada (ANTHROPIC_API_KEY).", citations: [] };
  }
  if (citations.length === 0) {
    return {
      answer: "To nije navedeno u dostupnim izvorima. Pokušajte preformulirati pitanje ili učitati relevantan dokument.",
      citations: [],
    };
  }
  const top = scored[0];
  return {
    answer: `Prema izvoru „${titleOf(top.chunk.documentId)}”, u dijelu „${top.chunk.heading}” navodi se: ${snippet(top.chunk.text, 360)}`,
    citations,
  };
}
