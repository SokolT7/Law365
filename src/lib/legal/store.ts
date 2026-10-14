import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import path from "node:path";
import { LEGAL_SCHEMA, migrateLegal } from "./schema.mjs";
import { bestPassage, fold, synonyms, terms } from "@/lib/legal/text";
import type { SourceKind, SourceRecord } from "@/lib/research/types";

/** Shared, read-mostly store of public law built by scripts/ingest-legal.mjs. Never holds firm data. */
let connection: DatabaseSync | null | undefined;
function db(): DatabaseSync | null {
  if (connection !== undefined) return connection;
  const filename = process.env.LTB_LEGAL_DB_PATH || path.join(process.cwd(), "data", "legal.sqlite");
  if (!existsSync(filename)) return (connection = null);
  connection = new DatabaseSync(filename);
  connection.exec(LEGAL_SCHEMA);
  migrateLegal(connection);
  return connection;
}

interface UnitRow {
  rowid: number; id: string; act_id: string | null; source: string; kind: string; title: string; short: string | null; ref: string | null;
  heading: string | null; text: string; url: string | null; ecli: string | null; court: string | null; decided_at: string | null;
  decision_type: string | null; keywords: string | null; amended_by: string | null; version_note?: string | null; score?: number;
  original_text?: string | null; consolidation?: string | null;
}

export interface LegalHit { row: UnitRow; score: number; direct: boolean; expandedBy?: string[] }

export interface SourceStatus { sourceId: string; units: number; acts: number; updatedAt: string | null }

/** Which catalogue sources actually have content (drives "Povezano" in the UI). */
export function legalStatus(): SourceStatus[] {
  const store = db();
  if (!store) return [];
  return (store.prepare("SELECT source, COUNT(*) units, COUNT(DISTINCT COALESCE(act_id, id)) acts, MAX(fetched_at) updated FROM legal_units GROUP BY source").all() as { source: string; units: number; acts: number; updated: string }[])
    .map((r) => ({ sourceId: r.source, units: r.units, acts: r.acts, updatedAt: r.updated }));
}

export function legalActs() {
  const store = db();
  if (!store) return [];
  return store.prepare("SELECT id, source, title, short, citation, url, version_note versionNote, amendments, fetched_at fetchedAt, unit_count units FROM legal_acts ORDER BY source, title").all() as {
    id: string; source: string; title: string; short: string | null; citation: string | null; url: string | null; versionNote: string | null; amendments: string; fetchedAt: string; units: number;
  }[];
}

// "ZOR 116", "čl. 116. ZOR-a", "članak 6 GDPR", "116. ZOR"
const ACT_ALIASES: Record<string, string[]> = {
  ZOR: ["zor", "zakon o radu", "zakona o radu"],
  ZOO: ["zoo", "zakon o obveznim odnosima", "zakona o obveznim odnosima"],
  ZTD: ["ztd", "zakon o trgovackim drustvima", "zakona o trgovackim drustvima"],
  ZPP: ["zpp", "zakon o parnicnom postupku", "zakona o parnicnom postupku"],
  ZPOUZP: ["zakon o provedbi opce uredbe", "zpouzp"],
  ZZP: ["zzp", "zakon o zastiti potrosaca", "zakona o zastiti potrosaca"],
  ZZKPP: ["zzkpp", "zakon o zakupu", "zakona o zakupu"],
  GDPR: ["gdpr", "opca uredba o zastiti podataka", "opce uredbe o zastiti podataka"],
};

export function directReferences(query: string): { short: string; number: string }[] {
  const q = fold(query);
  const found: { short: string; number: string }[] = [];
  for (const [short, aliases] of Object.entries(ACT_ALIASES)) {
    const alias = aliases.find((a) => q.includes(a));
    if (!alias) continue;
    // Inserted articles: "čl. 17.a ZOR", "ZOO 401a".
    const num = "(\\d+(?:\\.?[a-z](?![a-z]))?)";
    const near = new RegExp(`(?:cl(?:anak|anka|anku)?\\.?\\s*${num}\\.?[^a-z0-9]{0,12}${alias})|(?:${alias}[a-z-]*\\s*(?:,|\\s)*(?:cl(?:anak|anka|anku)?\\.?\\s*)?${num})`, "g");
    for (const m of q.matchAll(near)) {
      const number = (m[1] || m[2])?.replace(".", "");
      if (number && !found.some((f) => f.short === short && f.number === number)) found.push({ short, number });
    }
  }
  return found;
}

/** Inverse document frequency per stem (cached): rare legal terms matter more than "rok" or "ugovor". */
const idfCache = new Map<string, number>();
function idf(store: DatabaseSync, term: string): number {
  const cached = idfCache.get(term);
  if (cached !== undefined) return cached;
  const total = (store.prepare("SELECT COUNT(*) n FROM legal_units").get() as { n: number }).n || 1;
  let df = 0;
  try { df = (store.prepare("SELECT COUNT(*) n FROM legal_fts WHERE legal_fts MATCH ?").get(ftsQuery([term], true)) as { n: number }).n; } catch { df = 0; }
  const value = Math.log(1 + (total - df + 0.5) / (df + 0.5));
  idfCache.set(term, value);
  return value;
}

function ftsQuery(queryTerms: string[], all: boolean): string {
  return queryTerms.map((t) => { const group = [t, ...synonyms(t)].map((x) => `"${x}"*`); return group.length > 1 ? `(${group.join(" OR ")})` : group[0]; }).join(all ? " AND " : " OR ");
}

/**
 * Ranked full-text search over public law.
 * 1) direct article references, 2) all-terms match, 3) any-term match; bm25 with column weights
 * (title 2, ref 3, heading 4, keywords 3, text 1).
 */
export function searchLegal(query: string, kinds: SourceKind[], limit: number, preferActs: string[] = [], sources: string[] = []): LegalHit[] {
  const store = db();
  if (!store || !kinds.length) return [];
  const qTerms = terms(query);
  // Filter by kind and, when given, by catalogue source (CJEU and ECtHR judgments are "case" units too).
  const filter = `u.kind IN (${kinds.map(() => "?").join(",")})${sources.length ? ` AND u.source IN (${sources.map(() => "?").join(",")})` : ""}`;
  const filterArgs = [...kinds, ...sources];
  const hits = new Map<string, LegalHit>();

  for (const ref of directReferences(query)) {
    const row = store.prepare(`SELECT u.rowid, u.*, a.version_note FROM legal_units u LEFT JOIN legal_acts a ON a.id = u.act_id WHERE u.short = ? AND u.ref = ? AND ${filter}`)
      .get(ref.short, /[a-z]$/.test(ref.number) ? `Članak ${ref.number.slice(0, -1)}.${ref.number.slice(-1)}` : `Članak ${ref.number}.`, ...filterArgs) as UnitRow | undefined;
    if (row) hits.set(row.id, { row, score: 1000, direct: true });
  }
  const candidates = (match: string) => store.prepare(
    `SELECT u.rowid, u.*, a.version_note, bm25(legal_fts, 2.0, 3.0, 4.0, 3.0, 1.0) AS score
     FROM legal_fts JOIN legal_units u ON u.rowid = legal_fts.rowid LEFT JOIN legal_acts a ON a.id = u.act_id
     WHERE legal_fts MATCH ? AND ${filter} ORDER BY score LIMIT ?`,
  ).all(match, ...filterArgs, Math.max(60, limit * 12)) as unknown as UnitRow[];
  if (qTerms.length) {
    const run = (all: boolean) => candidates(ftsQuery(qTerms, all));
    const weights = new Map(qTerms.map((t) => [t, idf(store, t)]));
    const totalWeight = [...weights.values()].reduce((a, b) => a + b, 0) || 1;
    let rows: UnitRow[] = [];
    try {
      rows = run(true);
      if (rows.length < limit && qTerms.length > 1) rows = [...rows, ...run(false)];
    } catch {
      rows = [];
    }
    for (const row of rows) {
      if (hits.has(row.id)) continue;
      // bm25 is negative (lower is better); flip and favour preferred acts (playbooks) and statutes with headings.
      let score = -(row.score ?? 0);
      if (row.short && preferActs.includes(row.short)) score *= 1.6;
      // Coverage: how many distinct query terms appear in the unit.
      const body = fold(`${row.heading ?? ""} ${row.keywords ?? ""} ${row.text}`);
      const has = (hay: string, t: string) => hay.includes(t) || synonyms(t).some((x) => hay.includes(x));
      const coverage = qTerms.filter((t) => has(body, t)).reduce((sum, t) => sum + weights.get(t)!, 0) / totalWeight;
      const heading = fold(`${row.heading ?? ""} ${row.keywords ?? ""}`);
      const headingCoverage = heading ? qTerms.filter((t) => has(heading, t)).reduce((sum, t) => sum + weights.get(t)!, 0) / totalWeight : 0;
      // A hit must cover a fair share of the question, not just one shared word.
      if (qTerms.length >= 3 && coverage < 0.4) continue;
      // Long judgments contain nearly every word; their subject index must also match the question.
      if (row.kind === "case" && row.text.length > 15000 && heading.trim() && headingCoverage === 0) continue;
      score *= (0.5 + coverage) * (1 + headingCoverage);
      // Prefer current case law; older decisions stay findable but rank lower.
      if (row.kind === "case" && row.decided_at) { const year = Number(row.decided_at.slice(0, 4)); score *= year >= 2015 ? 1.25 : year >= 2005 ? 1 : 0.75; }
      hits.set(row.id, { row, score, direct: false });
    }
  }
  let ranked = [...hits.values()].sort((a, b) => b.score - a.score);
  // Drop the long tail: anything far weaker than the best non-direct hit is noise for the answer.
  const best = ranked.find((h) => !h.direct)?.score ?? 0;
  ranked = ranked.filter((h) => h.direct || h.score >= best * 0.3);

  // Pseudo-relevance feedback (RM3-style): when the question's own words find too little, borrow the most
  // distinctive terms of the strongest hits ("otkaz" → "redovit", "otkazn") and search again. Expanded hits
  // must still share a query term, rank below every original hit, and say which terms brought them in.
  if (qTerms.length && ranked.filter((h) => !h.direct).length < limit && ranked.length) {
    const expansion = ranked.length >= 2 ? feedbackTerms(store, ranked.slice(0, 3).map((h) => h.row), qTerms) : [];
    if (expansion.length) {
      const floor = Math.min(...ranked.map((h) => h.score));
      let extra: UnitRow[] = [];
      try { extra = candidates(`(${ftsQuery(qTerms, false)}) AND (${ftsQuery(expansion, false)})`); } catch { extra = []; }
      const found: LegalHit[] = [];
      for (const row of extra) {
        if (hits.has(row.id)) continue;
        const body = fold(`${row.heading ?? ""} ${row.keywords ?? ""} ${row.text}`);
        const matched = expansion.filter((t) => body.includes(t));
        const original = qTerms.filter((t) => body.includes(t) || synonyms(t).some((x) => body.includes(x))).length / qTerms.length;
        if (matched.length < Math.min(2, expansion.length) || original < 0.5) continue;
        found.push({ row, score: Math.min(floor * 0.95, -(row.score ?? 0)), direct: false, expandedBy: matched });
      }
      ranked = [...ranked, ...found.sort((a, b) => b.score - a.score)];
    }
  }
  return ranked.slice(0, limit);
}

/** Top distinctive stems of the feedback documents that the question does not already contain. */
function feedbackTerms(store: DatabaseSync, rows: UnitRow[], qTerms: string[], count = 4): string[] {
  const weight = new Map<string, number>();
  const docs = new Map<string, number>(); // in how many feedback documents a term occurs
  for (const row of rows) {
    const tf = new Map<string, number>();
    for (const token of fold(`${row.heading ?? ""} ${row.text.slice(0, 3000)}`).split(/[^a-z0-9]+/)) {
      const t = terms(token)[0]; // stems, and drops stopwords and numbers
      if (t) tf.set(t, (tf.get(t) ?? 0) + 1);
    }
    const total = [...tf.values()].reduce((a, b) => a + b, 0) || 1;
    for (const [t, n] of tf) { weight.set(t, (weight.get(t) ?? 0) + n / total); docs.set(t, (docs.get(t) ?? 0) + 1); }
  }
  const known = new Set(qTerms.flatMap((t) => [t, ...synonyms(t)]));
  return [...weight.entries()]
    // Consensus: a term from one document only (a party name, a one-off detail) would steer the search off course.
    .filter(([t]) => !known.has(t) && t.length >= 4 && (docs.get(t) ?? 0) >= 2)
    .sort((a, b) => b[1] - a[1]).slice(0, 15)
    .map(([t, w]) => [t, w * idf(store, t)] as const)
    .filter(([t]) => idf(store, t) > 2)
    .sort((a, b) => b[1] - a[1]).slice(0, count).map(([t]) => t);
}

const COURT_SHORT: [RegExp, string][] = [
  [/sud europske unije/i, "SEU"], [/europski sud za ljudska prava/i, "ESLJP"], [/agencija za zaštitu osobnih/i, "AZOP"],
  [/vrhovni sud/i, "VSRH"], [/visoki trgova/i, "VTSRH"], [/ustavni sud/i, "USRH"], [/županijski sud u (\S+)/i, "ŽS $1"], [/općinski .*sud u (\S+)/i, "OS $1"], [/trgovački sud u (\S+)/i, "TS $1"],
];
function courtShort(court: string | null): string {
  if (!court) return "";
  for (const [re, label] of COURT_SHORT) { const m = court.match(re); if (m) return label.replace("$1", m[1] ?? ""); }
  return court;
}

export function toSourceRecord(hit: LegalHit, n: number, query: string): SourceRecord {
  const { row } = hit;
  const kind = row.kind as SourceKind;
  const number = row.ref?.replace(/^Članak\s+/, "") ?? "";
  const label = kind === "case" ? `${courtShort(row.court)} ${row.ref ?? ""}`.trim() : `${row.short ?? row.title} čl. ${number}`;
  const consolidation = parseConsolidation(row.consolidation);
  return {
    n, id: row.id, kind, sourceId: row.source, label, title: row.title, ref: row.ref ?? undefined, heading: row.heading ?? undefined,
    excerpt: kind === "case" ? bestPassage(row.text, terms(query), 900) : row.text.length > 1600 ? bestPassage(row.text, terms(query), 1600) : row.text,
    url: row.url ?? undefined, ecli: row.ecli ?? undefined, court: row.court ?? undefined, decidedAt: row.decided_at ?? undefined,
    decisionType: row.decision_type ?? undefined, consolidatedWith: consolidation.applied.length ? consolidation.applied : undefined,
    pendingAmendments: consolidation.pending.length ? consolidation.pending : undefined, versionNote: row.version_note ?? undefined,
  };
}

export interface Consolidation { applied: string[]; pending: { citation: string; text: string }[]; inserted: boolean }
/** Which amending acts were applied automatically, and which instructions still need a manual check. */
export function parseConsolidation(raw: string | null | undefined): Consolidation {
  try {
    const value = JSON.parse(raw || "{}") as Partial<Consolidation>;
    return { applied: value.applied ?? [], pending: (value.pending ?? []).map((p) => ({ citation: p.citation, text: p.text })), inserted: !!value.inserted };
  } catch { return { applied: [], pending: [], inserted: false }; }
}

/** Full stored text of a legal unit, for the in-app evidence panel. */
export function legalUnit(id: string) {
  const store = db();
  if (!store) return null;
  return (store.prepare("SELECT u.*, a.version_note FROM legal_units u LEFT JOIN legal_acts a ON a.id = u.act_id WHERE u.id = ?").get(id) as UnitRow | undefined) ?? null;
}
