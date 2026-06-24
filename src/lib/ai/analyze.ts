import type { AnalysisResult, Chunk, Mode } from "@/lib/types";
import { PLAYBOOK } from "@/lib/playbook/trgovacki";
import { getClient, getModel, textOf } from "@/lib/ai/client";

function deburr(s: string): string {
  return s
    .replace(/č|ć/g, "c").replace(/đ/g, "d").replace(/š/g, "s").replace(/ž/g, "z")
    .replace(/Č|Ć/g, "C").replace(/Đ/g, "D").replace(/Š/g, "S").replace(/Ž/g, "Z");
}

const MONTHS: Record<string, number> = {
  siječnja: 0, veljače: 1, ožujka: 2, travnja: 3, svibnja: 4, lipnja: 5,
  srpnja: 6, kolovoza: 7, rujna: 8, listopada: 9, studenoga: 10, prosinca: 11,
};

function parseCroatianDate(text: string): string | undefined {
  const m = text.match(
    /(\d{1,2})\.\s*(siječnja|veljače|ožujka|travnja|svibnja|lipnja|srpnja|kolovoza|rujna|listopada|studenoga|prosinca)\s*(\d{4})/i
  );
  if (!m) return undefined;
  const day = parseInt(m[1], 10);
  const month = MONTHS[m[2].toLowerCase()];
  const year = parseInt(m[3], 10);
  if (month === undefined) return undefined;
  return new Date(Date.UTC(year, month, day)).toISOString();
}

function classify(text: string): string {
  const t = deburr(text.toLowerCase());
  if (t.includes("povjerljiv") || t.includes("nda")) return "Ugovor o povjerljivosti (NDA)";
  if (t.includes("najm")) return "Ugovor o najmu";
  if (t.includes("saas") || t.includes("pretplat") || t.includes("softver")) return "Ugovor o pretplati (SaaS)";
  if (t.includes("kupoprodaj")) return "Ugovor o kupoprodaji";
  if (t.includes("ugovor o radu")) return "Ugovor o radu";
  if (t.includes("okvirni") || t.includes("uslug")) return "Okvirni ugovor o uslugama";
  return "Trgovački ugovor";
}

function findChunkContaining(chunks: Chunk[], needle: string): string | undefined {
  const n = deburr(needle.toLowerCase());
  const hit = chunks.find((c) => deburr(c.text.toLowerCase()).includes(n));
  return hit?.id;
}

function extractKeyTerms(text: string, chunks: Chunk[]) {
  const terms: AnalysisResult["keyTerms"] = [];

  // Ugovorne strane
  const parties = Array.from(
    text.matchAll(/([A-ZČĆŠĐŽ][A-Za-zČĆŠĐŽčćšđž.& ]+?(?:d\.o\.o\.|j\.d\.o\.o\.|d\.d\.|Ltd))/g)
  )
    .map((m) => m[1].trim().replace(/\s+/g, " "))
    .filter((v, i, a) => a.indexOf(v) === i)
    .slice(0, 3);
  if (parties.length) {
    terms.push({ label: "Ugovorne strane", value: parties.join(" · "), chunkId: chunks[0]?.id });
  }

  // Vrijednost / cijena
  const amount = text.match(/([\d.]+,\d{2})\s*EUR/);
  if (amount) {
    terms.push({
      label: "Vrijednost / cijena",
      value: `${amount[1]} EUR`,
      chunkId: findChunkContaining(chunks, amount[0]),
    });
  }

  // Rok plaćanja
  const pay = text.match(/roku od (\d+)\s*dana/i);
  if (pay) {
    terms.push({
      label: "Rok plaćanja",
      value: `${pay[1]} dana`,
      chunkId: findChunkContaining(chunks, pay[0]),
    });
  }

  // Mjerodavno pravo
  const td = deburr(text.toLowerCase());
  let pravo = "Nije izrijekom navedeno";
  if (td.includes("pravo republike hrvatske") || td.includes("hrvatsk")) pravo = "Pravo Republike Hrvatske";
  if (td.includes("pravo irske")) pravo = "Pravo Irske (strano)";
  if (td.includes("englesko pravo")) pravo = "Englesko pravo (strano)";
  terms.push({
    label: "Mjerodavno pravo",
    value: pravo,
    chunkId: findChunkContaining(chunks, "mjerodavno"),
  });

  // Trajanje / produljenje
  if (td.includes("automatski produljuje") || td.includes("automatsko produljenje")) {
    terms.push({
      label: "Trajanje",
      value: "Automatsko produljenje",
      chunkId: findChunkContaining(chunks, "produljuje"),
    });
  }

  return terms;
}

function extractObligations(chunks: Chunk[]) {
  const obligations: AnalysisResult["obligations"] = [];
  const triggers = ["obvezuje se", "dužan", "dospijeva", "isporučiti", "platiti", "plaćati"];
  for (const c of chunks) {
    const low = deburr(c.text.toLowerCase());
    if (triggers.some((t) => low.includes(deburr(t)))) {
      const sentence = c.text.replace(/\s+/g, " ").trim();
      const short = sentence.length > 180 ? sentence.slice(0, 177) + "…" : sentence;
      obligations.push({
        text: `${c.heading}: ${short}`,
        dueDate: parseCroatianDate(c.text),
        chunkId: c.id,
      });
    }
    if (obligations.length >= 5) break;
  }
  return obligations;
}

function runPlaybook(text: string, chunks: Chunk[]) {
  const findings: AnalysisResult["findings"] = [];
  const td = deburr(text.toLowerCase());
  for (const rule of PLAYBOOK) {
    const present = rule.keywords.some((k) => td.includes(deburr(k.toLowerCase())));
    const triggered = rule.kind === "present" ? present : !present;
    if (!triggered) continue;
    let chunkId: string | undefined;
    if (rule.kind === "present") {
      const kw = rule.keywords.find((k) => td.includes(deburr(k.toLowerCase())));
      if (kw) chunkId = findChunkContaining(chunks, kw);
    }
    findings.push({
      ruleId: rule.id,
      title: rule.title,
      detail: rule.detail,
      severity: rule.severity,
      chunkId,
    });
  }
  return findings;
}

function buildSummary(type: string, terms: AnalysisResult["keyTerms"], findings: AnalysisResult["findings"]): string {
  const parties = terms.find((t) => t.label === "Ugovorne strane")?.value ?? "ugovornim stranama";
  const value = terms.find((t) => t.label === "Vrijednost / cijena")?.value;
  const pravo = terms.find((t) => t.label === "Mjerodavno pravo")?.value;
  const high = findings.filter((f) => f.severity === "visoka").length;
  const parts: string[] = [];
  parts.push(`${type} sklopljen između: ${parties}.`);
  if (value) parts.push(`Procijenjena vrijednost iznosi ${value}.`);
  if (pravo) parts.push(`Mjerodavno pravo: ${pravo}.`);
  parts.push(
    `Automatskim pregledom prema standardima društva utvrđeno je ${findings.length} ${
      findings.length === 1 ? "nalaz" : "nalaza"
    }${high ? `, od toga ${high} visokog rizika` : ""}.`
  );
  return parts.join(" ");
}

/** Analiza temeljena na pravilima (DEMO način) — determinističko i brzo. */
export function analyzeRuleBased(text: string, chunks: Chunk[]): AnalysisResult {
  const type = classify(text);
  const keyTerms = extractKeyTerms(text, chunks);
  const obligations = extractObligations(chunks);
  const findings = runPlaybook(text, chunks);
  const summary = buildSummary(type, keyTerms, findings);
  return { type, summary, keyTerms, obligations, findings };
}

async function summariseWithClaude(text: string): Promise<string | undefined> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const client: any = await getClient();
  const msg = await client.messages.create({
    model: getModel(),
    max_tokens: 600,
    system:
      "Ti si hrvatski pravni asistent. Sažmi ugovor u 3–4 rečenice na hrvatskom jeziku, " +
      "jasno i poslovno. Navedi vrstu ugovora, strane, glavnu obvezu i ključne rokove. " +
      "Ne izmišljaj podatke kojih nema u tekstu.",
    messages: [{ role: "user", content: text.slice(0, 12000) }],
  });
  const out = textOf(msg);
  return out || undefined;
}

/**
 * Glavni ulaz. DEMO način uvijek koristi analizu pravilima.
 * LIVE način dodatno traži od Claudea bolji sažetak (uz siguran fallback).
 */
export async function analyzeContract(
  text: string,
  chunks: Chunk[],
  mode: Mode
): Promise<AnalysisResult> {
  const base = analyzeRuleBased(text, chunks);
  if (mode === "live") {
    try {
      const summary = await summariseWithClaude(text);
      if (summary) base.summary = summary;
    } catch {
      /* tihi fallback na sažetak iz pravila */
    }
  }
  return base;
}
