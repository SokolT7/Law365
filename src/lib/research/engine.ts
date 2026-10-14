import type { Chunk, DocumentRec, Mode } from "@/lib/types";
import type { DeadlineCalculation, ResearchMessage, SearchStep, SourceKind, SourceRecord, StreamEvent } from "@/lib/research/types";
import { legalStatus, searchLegal, toSourceRecord } from "@/lib/legal/store";
import { bestPassage, fold, terms } from "@/lib/legal/text";
import { searchChunks } from "@/lib/retrieval/search";
import { getClient, getModel } from "@/lib/ai/client";
import { detectDeadline } from "@/lib/research/calculate";
import { verifyAnswer } from "@/lib/research/verify";
import type { Playbook } from "@/lib/research/playbooks";

export interface ResearchInput {
  question: string;
  history: { role: "user" | "assistant"; text: string }[];
  /** Firm document chunks the user may read (already permission-filtered). */
  chunks: Chunk[];
  docs: DocumentRec[];
  /** Enabled catalogue sources from firm settings (server-authoritative). */
  sources: Record<string, boolean>;
  mode: Mode;
  playbook?: Playbook;
  /** "document" focuses on one document's chunks; "research" spans the firm and public law. */
  scope: "research" | "document";
  documentTitle?: string;
  image?: { mediaType: string; data: string };
  signal?: AbortSignal;
}

const LEGAL_SOURCES: { sourceId: string; kind: SourceKind; label: string; limit: number }[] = [
  { sourceId: "rh-zakoni", kind: "statute", label: "Propisi RH (Narodne novine)", limit: 5 },
  { sourceId: "rh-praksa", kind: "case", label: "Sudska praksa RH", limit: 3 },
  { sourceId: "eu-propisi", kind: "eu", label: "EU propisi (EUR-Lex)", limit: 3 },
  { sourceId: "eu-sud", kind: "case", label: "Sud Europske unije", limit: 2 },
  { sourceId: "echr", kind: "case", label: "Europski sud za ljudska prava", limit: 2 },
  { sourceId: "azop", kind: "case", label: "AZOP rješenja i mišljenja", limit: 2 },
];

const sentenceSplit = (text: string) => text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-ZČĆĐŠŽ(„"])/);
function keySentence(text: string, qTerms: string[], max = 240): string {
  const sentences = sentenceSplit(text).filter((s) => s.length > 30);
  const scored = sentences.map((s) => ({ s, score: qTerms.filter((t) => fold(s).includes(t)).length }));
  const best = scored.sort((a, b) => b.score - a.score)[0]?.s ?? text;
  return best.length > max ? `${best.slice(0, max).replace(/\s+\S*$/, "")}…` : best;
}

function formatDate(isoDate?: string) {
  if (!isoDate) return "";
  const [y, m, d] = isoDate.split("-");
  return `${Number(d)}. ${Number(m)}. ${y}.`;
}

/** Extractive, clearly labelled answer used when no AI key is configured. Every claim carries its source number. */
function foundSources(n: number): string {
  const rule = new Intl.PluralRules("hr-HR").select(n);
  return rule === "one" ? `pronađen je ${n} relevantan izvor` : rule === "few" ? `pronađena su ${n} relevantna izvora` : `pronađeno je ${n} relevantnih izvora`;
}

function demoAnswer(question: string, sources: SourceRecord[], calc: DeadlineCalculation | null, scope: "research" | "document" = "research"): string {
  const qTerms = terms(question);
  const statutes = sources.filter((s) => s.kind === "statute" || s.kind === "eu");
  const cases = sources.filter((s) => s.kind === "case");
  const firm = sources.filter((s) => s.kind === "firm");
  const lead = scope === "document" ? firm[0] ?? statutes[0] ?? cases[0] : statutes[0] ?? firm[0] ?? cases[0];
  const parts: string[] = [];
  const firmSection = () => {
    if (!firm.length) return;
    parts.push(scope === "document" ? "## Iz dokumenta" : "## Iz dokumenata ureda");
    for (const s of firm) parts.push(`- ${scope === "document" ? "" : `**${s.title}** — `}${s.heading ? `*${s.heading}*: ` : ""}${keySentence(s.excerpt, qTerms)} [${s.n}]`);
  };
  parts.push("## Sažetak");
  const leadName = lead.kind === "firm" ? (scope === "document" ? "dokument" : `dokument **${lead.title}**`) : `odredba **${lead.label}**${lead.heading ? ` (${lead.heading})` : ""}`;
  parts.push(`Za ovo pitanje ${foundSources(sources.length)}. Najrelevantniji je ${leadName}: ${keySentence(lead.excerpt, qTerms)} [${lead.n}]`.replace("Najrelevantniji je odredba", "Najrelevantnija je odredba"));
  if (scope === "document") firmSection();
  if (calc) parts.push(`Izračunati rok: **${formatDate(calc.adjustedEnd ?? calc.end)}** (${calc.label}).`);
  if (statutes.length) {
    parts.push("## Relevantne odredbe");
    for (const s of statutes) parts.push(`- **${s.label}**${s.heading ? ` — ${s.heading}` : ""}: ${keySentence(s.excerpt, qTerms)} [${s.n}]`);
  }
  if (cases.length) {
    parts.push("## Sudska praksa");
    for (const s of cases) parts.push(`- **${s.label}** (${[s.decisionType?.split(" · ")[0], formatDate(s.decidedAt)].filter(Boolean).join(", ")}): ${keySentence(s.excerpt, qTerms)} [${s.n}]`);
  }
  if (scope === "research") firmSection();
  const pending = statutes.filter((s) => s.pendingAmendments?.length);
  if (pending.length) {
    parts.push("## Upozorenje o izmjenama");
    for (const s of pending) parts.push(`- **${s.label}**: dio izmjena iz ${[...new Set(s.pendingAmendments!.map((p) => p.citation))].join(", ")} nije automatski ugrađen u tekst; provjerite pročišćeni tekst prije oslanjanja na odredbu [${s.n}].`);
  }
  parts.push("## Napomena");
  parts.push("AI način rada nije uključen: odgovor je sastavljen iz izdvojenih odlomaka bez AI obrade. Otvorite izvore i provjerite tekst prije primjene.");
  return parts.join("\n\n");
}

function systemPrompt(input: ResearchInput): string {
  const base = [
    "Ti si LTB Law, pravni istraživački asistent za hrvatsko i europsko pravo koji pomaže odvjetnicima.",
    "PRAVILA:",
    "1. Odgovaraj isključivo na temelju numeriranih izvora. Ne koristi vanjsko znanje i ne izmišljaj propise, članke ni odluke.",
    "2. Svaku tvrdnju potkrijepi oznakom izvora odmah iza tvrdnje, npr. [1] ili [2][4]. Koristi samo brojeve iz popisa izvora.",
    "3. Ako izvori ne sadrže odgovor, to jasno reci u sažetku i ne nagađaj.",
    "4. Tekstovi zakona su automatski pročišćeni. Ako je uz članak navedeno 'Neugrađene izmjene', upozori da odredbu treba provjeriti u službenom pročišćenom tekstu.",
    "5. Ne daješ obvezujući pravni savjet; odgovor mora provjeriti odvjetnik.",
    "OBLIK (Markdown, hrvatski jezik):",
    "## Sažetak — 2 do 4 rečenice s izravnim odgovorom.",
    "## Analiza — po potrebi podnaslovi ###; rokove i usporedbe prikaži tablicom.",
    "## Rizici i česte pogreške — samo ako su relevantni.",
    "## Zaključak — jasna preporuka i sljedeći koraci.",
    "Za kratka i jednostavna pitanja izostavi nepotrebne odjeljke, ali uvijek počni sažetkom.",
  ];
  if (input.scope === "document") base.splice(1, 0, `Korisnik postavlja pitanje o dokumentu „${input.documentTitle ?? "dokument"}”. Prednost daj izvorima iz tog dokumenta; propise koristi za kontekst.`);
  if (input.playbook) base.push(`UPUTE ASISTENTA „${input.playbook.name}”: ${input.playbook.instructions}`);
  return base.join("\n");
}

function contextBlock(sources: SourceRecord[], calc: DeadlineCalculation | null): string {
  const lines = sources.map((s) => {
    const head = s.kind === "case"
      ? `[${s.n}] ${s.label} — ${s.court ?? ""}, ${formatDate(s.decidedAt)}, ${s.decisionType ?? ""}`
      : s.kind === "firm" ? `[${s.n}] Dokument ureda: ${s.title} — ${s.heading ?? ""}` : `[${s.n}] ${s.label} — ${s.title}${s.heading ? `, ${s.heading}` : ""}`;
    const note = s.pendingAmendments?.length ? `\nNeugrađene izmjene: ${s.pendingAmendments.map((p) => `${p.citation}: ${p.text}`).join(" | ")}`
      : s.consolidatedWith?.length ? `\nPročišćeno s izmjenama: ${s.consolidatedWith.join(", ")}` : "";
    return `${head}${note}\n${s.excerpt}`;
  });
  if (calc) lines.push(`IZRAČUN ROKA (izračunat programski, koristi ga doslovno): ${calc.label}; rok istječe ${formatDate(calc.adjustedEnd ?? calc.end)}. ${calc.adjustedReason ?? ""} ${calc.rule}`);
  return lines.join("\n\n");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Runs one research turn and yields protocol events. The caller persists the final message. */
export async function* runResearch(input: ResearchInput, messageId: string): AsyncGenerator<StreamEvent> {
  const { question, signal } = input;
  const steps: SearchStep[] = [];
  const step = (s: SearchStep): StreamEvent => {
    const i = steps.findIndex((x) => x.id === s.id);
    if (i >= 0) steps[i] = s; else steps.push(s);
    return { type: "status", step: s };
  };

  yield step({ id: "intent", label: "Razumijem pitanje", state: "running" });
  const qTerms = terms(question);
  yield step({ id: "intent", label: "Razumijem pitanje", detail: qTerms.slice(0, 6).join(", ") || "opće pitanje", state: "done" });

  const records: SourceRecord[] = [];
  const add = (r: Omit<SourceRecord, "n">) => { if (!records.some((x) => x.id === r.id)) records.push({ ...r, n: records.length + 1 }); };

  const firmEnabled = input.sources["vasi-dokumenti"] !== false && input.chunks.length > 0;
  const titleOf = (id: string) => input.docs.find((d) => d.id === id)?.title ?? "Dokument ureda";
  const firmStep = async function* () {
    if (!firmEnabled) return;
    yield step({ id: "firm", label: input.scope === "document" ? "Pretražujem dokument" : "Pretražujem dokumente ureda", state: "running" });
    const hits = searchChunks(question, input.chunks, input.scope === "document" ? 6 : 4);
    for (const h of hits) add({
      id: `firm:${h.chunk.id}`, kind: "firm", sourceId: "vasi-dokumenti", label: titleOf(h.chunk.documentId), title: titleOf(h.chunk.documentId),
      heading: h.chunk.heading, excerpt: bestPassage(h.chunk.text, qTerms, 900), documentId: h.chunk.documentId, chunkId: h.chunk.id,
    });
    yield step({ id: "firm", label: input.scope === "document" ? "Pretražujem dokument" : "Pretražujem dokumente ureda", detail: hits.length ? `${hits.length} odlomaka` : "bez rezultata", state: "done", count: hits.length });
  };

  if (input.scope === "document") yield* firmStep();

  const available = new Set(legalStatus().map((s) => s.sourceId));
  for (const src of LEGAL_SOURCES) {
    if (signal?.aborted) return;
    if (!input.sources[src.sourceId] || !available.has(src.sourceId)) continue;
    yield step({ id: src.sourceId, label: `Pretražujem: ${src.label}`, detail: question.length > 80 ? `${question.slice(0, 80)}…` : question, state: "running" });
    await sleep(0);
    const limit = input.scope === "document" ? Math.max(2, src.limit - 2) : src.limit;
    const hits = searchLegal(question, [src.kind], limit, input.playbook?.preferActs ?? [], [src.sourceId]);
    for (const h of hits) add(toSourceRecord(h, 0, question));
    const expanded = [...new Set(hits.flatMap((h) => h.expandedBy ?? []))];
    const found = hits.length ? hits.slice(0, 3).map((h) => toSourceRecord(h, 0, question).label).join(", ") : "bez rezultata";
    yield step({ id: src.sourceId, label: `Pretražujem: ${src.label}`, detail: expanded.length ? `${found} · prošireno pojmovima iz izvora: ${expanded.join(", ")}` : found, state: "done", count: hits.length });
  }

  if (input.scope === "research") yield* firmStep();

  // Renumber in display order: statutes, EU, cases, firm documents (document scope: firm first).
  const order: SourceKind[] = input.scope === "document" ? ["firm", "statute", "eu", "case"] : ["statute", "eu", "case", "firm"];
  records.sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.n - b.n);
  records.forEach((r, i) => { r.n = i + 1; });
  yield { type: "sources", sources: records };

  const topStatute = records.find((r) => r.kind === "statute");
  const calc = detectDeadline(question, topStatute ? { label: topStatute.label, text: topStatute.excerpt } : undefined);
  if (calc) {
    yield step({ id: "calc", label: "Izračunavam rok", detail: calc.label, state: "done" });
    yield { type: "calculation", calculation: calc };
  }

  if (!records.length) {
    const text = "## Sažetak\n\nU uključenim izvorima nisam pronašao odgovor na ovo pitanje. Pokušajte preformulirati pitanje, uključiti dodatne izvore ili učitati relevantan dokument.";
    yield { type: "delta", text };
    const message: ResearchMessage = { id: messageId, role: "assistant", text, ts: new Date().toISOString(), sources: [], steps, verification: { citedSources: 0, totalSources: 0, removedMarkers: [], uncitedParagraphs: 0, ok: true } };
    yield { type: "verification", verification: message.verification! };
    yield { type: "complete", message };
    return;
  }

  yield step({ id: "answer", label: "Sastavljam odgovor", state: "running" });
  let text = "";
  if (input.mode === "live") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = await getClient();
    const history = input.history.slice(-6).map((m) => ({ role: m.role, content: m.text }));
    while (history.length && history[0].role === "assistant") history.shift();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userContent: any[] = [];
    if (input.image) userContent.push({ type: "image", source: { type: "base64", media_type: input.image.mediaType, data: input.image.data } });
    userContent.push({ type: "text", text: `Pitanje: ${question}\n\nIzvori:\n${contextBlock(records, calc)}` });
    const stream = client.messages.stream({ model: getModel(), max_tokens: 2500, system: systemPrompt(input), messages: [...history, { role: "user", content: userContent }] });
    const abort = () => stream.abort?.();
    signal?.addEventListener("abort", abort);
    try {
      for await (const event of stream) {
        if (signal?.aborted) break;
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          text += event.delta.text;
          yield { type: "delta", text: event.delta.text };
        }
      }
    } finally {
      signal?.removeEventListener("abort", abort);
    }
  } else {
    const full = demoAnswer(question, records, calc, input.scope);
    // Stream in small word groups so the interface behaves the same as in live mode.
    const pieces = full.match(/\S+\s*/g) ?? [full];
    for (let i = 0; i < pieces.length; i += 4) {
      if (signal?.aborted) break;
      const piece = pieces.slice(i, i + 4).join("");
      text += piece;
      yield { type: "delta", text: piece };
      await sleep(18);
    }
  }
  yield step({ id: "answer", label: "Sastavljam odgovor", state: "done" });

  const { text: verifiedText, verification } = verifyAnswer(text, records.length);
  yield step({ id: "verify", label: "Provjeravam citate", detail: verification.ok ? `${verification.citedSources} izvora citirano` : "pronađena odstupanja", state: "done" });
  yield { type: "verification", verification };
  const message: ResearchMessage = {
    id: messageId, role: "assistant", text: verifiedText, ts: new Date().toISOString(), sources: records, steps,
    verification, calculation: calc ?? undefined, playbookId: input.playbook?.id, stopped: signal?.aborted || undefined,
  };
  yield { type: "complete", message };
}
