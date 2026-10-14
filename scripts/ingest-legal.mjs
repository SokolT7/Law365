#!/usr/bin/env node
// Builds the shared legal store (data/legal.sqlite) from official publications:
//   • Narodne novine (statutes, split per article; amending acts mapped onto articles)
//   • EU Publications Office / Cellar (EU acts in Croatian, per article)
//   • odluke.sudovi.hr (court decisions with metadata and full text)
//   • Court of Justice of the EU (selected judgments in Croatian, Cellar), ECtHR (HUDOC, Croatian translations),
//     AZOP (published decisions on azop.hr)
// Usage: node scripts/ingest-legal.mjs [--only=statutes,eu,cases,cjeu,echr,azop] [--cases-per-topic=6]
// Re-running replaces each act/decision in place. Requests are spaced to be polite to public servers.
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { LEGAL_SCHEMA, migrateLegal } from "../src/lib/legal/schema.mjs";
import { applyAmendment, orderedArticles } from "./lib/consolidate.mjs";
import { STATUTES, EU_ACTS, CASE_TOPICS, CASES_PER_TOPIC, CJEU_CASES, ECHR_LIMIT, ECHR_ARTICLES, AZOP_LISTING, AZOP_LIMIT } from "../src/lib/legal/catalog.mjs";

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, "").split("=")));
const only = new Set((args.only || "statutes,eu,cases,cjeu,echr,azop").split(","));
const perTopic = Number(args["cases-per-topic"] || CASES_PER_TOPIC);
const filename = process.env.LTB_LEGAL_DB_PATH || path.resolve("data/legal.sqlite");
mkdirSync(path.dirname(filename), { recursive: true });
const db = new DatabaseSync(filename);
db.exec("PRAGMA journal_mode=WAL;");
db.exec(LEGAL_SCHEMA);
migrateLegal(db);

const UA = "LTBLaw-legal-ingest/1.0 (private legal workspace; low-volume)";
const DELAY_MS = Number(process.env.LTB_INGEST_DELAY_MS || 700);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let lastRequest = 0;
async function get(url, headers = {}, attempt = 1) {
  const wait = lastRequest + DELAY_MS - Date.now();
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, ...headers }, redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (error) {
    if (attempt >= 3) throw new Error(`${url}: ${error.message}`);
    await sleep(1500 * attempt);
    return get(url, headers, attempt + 1);
  }
}

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", copy: "©", ndash: "–", mdash: "—", bdquo: "„", ldquo: "“", rdquo: "”", scaron: "š", Scaron: "Š", zcaron: "ž", Zcaron: "Ž" };
function decode(s) {
  return s.replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITIES[n] ?? m);
}
const clean = (html) => decode(html.replace(/\s*\r?\n\s*/g, " ").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ")).replace(/[ \t ]+/g, " ").replace(/ *\n */g, "\n").trim();
const now = () => new Date().toISOString();

const insertUnit = db.prepare(`INSERT INTO legal_units (id, act_id, source, kind, title, short, ref, heading, text, url, ecli, court, decided_at, decision_type, registry, keywords, statutes, amended_by, fetched_at)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
const setConsolidation = db.prepare("UPDATE legal_units SET original_text = ?, consolidation = ? WHERE id = ?");
const refOf = (n) => (/[a-z]$/.test(n) ? `Članak ${n.slice(0, -1)}.${n.slice(-1)}` : `Članak ${n}.`);
const upsertAct = db.prepare(`INSERT INTO legal_acts (id, source, title, short, citation, url, version_note, amendments, fetched_at, unit_count) VALUES (?,?,?,?,?,?,?,?,?,?)
  ON CONFLICT(id) DO UPDATE SET source=excluded.source, title=excluded.title, short=excluded.short, citation=excluded.citation, url=excluded.url, version_note=excluded.version_note, amendments=excluded.amendments, fetched_at=excluded.fetched_at, unit_count=excluded.unit_count`);
const deleteActUnits = db.prepare("DELETE FROM legal_units WHERE act_id = ?");
const deleteUnit = db.prepare("DELETE FROM legal_units WHERE id = ?");

/* ---------------- Narodne novine ---------------- */

async function findNN({ year, issue, match, decision }, base) {
  const html = await get(`https://narodne-novine.nn.hr/search.aspx?sortiraj=4&kategorija=1&godina=${year}&broj=${issue}&rpp=200&qtype=1&pretraga=da`);
  const rows = [...html.matchAll(/href="(\/clanci\/sluzbeni\/[^"]+\.html)"[^>]*>([\s\S]*?)<\/a>/g)]
    .map(([, href, title]) => ({ url: `https://narodne-novine.nn.hr${href}`, title: clean(title).replace(/\s+\d+$/, "") }))
    .filter((row) => row.title);
  const wanted = match.toLowerCase();
  const hit = rows.find((row) => {
    const t = row.title.toLowerCase();
    return base ? t.startsWith(wanted) : t.includes(wanted) && (decision || /izmjen|dopun/.test(t));
  });
  if (!hit) throw new Error(`NN ${issue}/${year}: no title matching "${match}"`);
  return hit;
}

function paragraphs(html) {
  return [...html.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)].map(([, attrs, inner]) => ({ attrs, text: clean(inner) })).filter((p) => p.text);
}

const ARTICLE = /^Članak\s+(\d+)\.?\s*([a-z])?\.?\s*$/i;
// Headings start with a capital or a chapter number; list items ("6) …", "– …", "a) …") and running text do not.
const headingLike = (t) => !!t && !ARTICLE.test(t) && t.length < 140 && !/[.;:,]$/.test(t) && !/^(\(?\d+\)|\(?[a-zčćđšž]\)|[–-]|\d+\.\s*\d)/i.test(t) && /^([A-ZČĆĐŠŽ]|\d+\.\s+[A-ZČĆĐŠŽ]|[IVXL]+\.\s)/.test(t);
function parseArticles(html) {
  const ps = paragraphs(html);
  const articles = [];
  let current = null;
  let section = "";
  for (let i = 0; i < ps.length; i++) {
    const { text } = ps[i];
    const m = text.match(ARTICLE);
    if (m) {
      const prev = ps[i - 1]?.text || "";
      const heading = headingLike(prev) ? prev : "";
      // A heading block that is not preceded by another heading opens a new subdivision: drop a stale section.
      if (heading && !headingLike(ps[i - 2]?.text) && section && heading === heading.toUpperCase()) section = heading;
      current = { number: `${m[1]}${(m[2] ?? "").toLowerCase()}`, heading, section, lines: [] };
      articles.push(current);
      continue;
    }
    // Two heading lines in a row: the first is a section title ("Ugovorna kazna" above "Opća pravila").
    if (headingLike(text) && (headingLike(ps[i + 1]?.text) || ARTICLE.test(ps[i + 1]?.text || ""))) {
      if (headingLike(ps[i + 1]?.text)) section = text.replace(/^\d+\.\s*/, "");
      if (current) continue;
    }
    if (!current) continue;
    current.lines.push(text);
  }
  // Consolidated texts repeat transitional articles of earlier acts; the first (main) occurrence wins.
  const seen = new Set();
  return articles.filter((a) => a.lines.length && !seen.has(a.number) && seen.add(a.number));
}

async function ingestStatute(spec) {
  const base = await findNN(spec.base, true);
  const html = await get(base.url);
  const parsed = parseArticles(html);
  if (parsed.length < 3) throw new Error(`${spec.title}: parsed only ${parsed.length} articles`);
  const articles = new Map(parsed.map((a) => [a.number, { ...a }]));
  const original = new Map(parsed.map((a) => [a.number, a.lines.join("\n")]));
  const appliedBy = new Map();   // article → citations applied
  const pendingBy = new Map();   // article → [{citation, text}]
  const amendments = [];
  let appliedCount = 0, pendingCount = 0;
  for (const a of spec.amendments) {
    const citation = `NN ${a.issue}/${String(a.year).slice(2)}`;
    try {
      const hit = await findNN(a, false);
      if (a.decision) { amendments.push({ citation, title: hit.title, url: hit.url, decision: true, applied: 0, pending: 0 }); continue; }
      const lines = paragraphs(await get(hit.url)).map((p) => p.text);
      const result = applyAmendment(articles, lines, citation);
      for (const n of result.applied) appliedBy.set(n, [...(appliedBy.get(n) || []), citation]);
      for (const p of result.pending) { const key = p.article ?? "*"; pendingBy.set(key, [...(pendingBy.get(key) || []), { citation, text: p.text }]); }
      appliedCount += result.applied.size; pendingCount += result.pending.length;
      amendments.push({ citation, title: hit.title, url: hit.url, applied: result.applied.size, pending: result.pending.length });
    } catch (error) {
      console.warn(`  ! amendment ${a.issue}/${a.year}: ${error.message}`);
    }
  }
  const citation = `NN ${spec.base.issue}/${String(spec.base.year).slice(2)}`;
  const decisions = amendments.filter((a) => a.decision).map((a) => a.citation);
  const appliedActs = amendments.filter((a) => !a.decision).map((a) => a.citation);
  const note = appliedActs.length
    ? `Pročišćeni tekst izrađen automatski: ${citation} s izmjenama ${appliedActs.join(", ")}.${decisions.length ? ` Odluke Ustavnog suda (${decisions.join(", ")}) nisu ugrađene.` : ""} Provjerite s pročišćenim tekstom prije oslanjanja.`
    : `Tekst iz ${citation}.`;
  const ordered = orderedArticles(articles);
  db.exec("BEGIN");
  try {
    deleteActUnits.run(spec.id);
    let stored = 0;
    for (const article of ordered) {
      if (article.deleted) continue;
      const id = `${spec.id}:${article.number}`;
      const section = (article.section ?? (article.after ? articles.get(article.after)?.section : null) ?? "").replace(/\s*\n\s*/g, " – ") || null;
      const applied = appliedBy.get(article.number) || [];
      const pending = [...(pendingBy.get(article.number) || [])];
      insertUnit.run(id, spec.id, "rh-zakoni", "statute", spec.title, spec.short, refOf(article.number), article.heading || null,
        article.lines.join("\n"), base.url, null, null, null, null, null, section, null, JSON.stringify([...new Set([...applied, ...pending.map((p) => p.citation)])]), now());
      const before = original.get(article.number);
      setConsolidation.run(before && before !== article.lines.join("\n") ? before : null, JSON.stringify({ applied, pending, inserted: !!article.inserted }), id);
      stored++;
    }
    upsertAct.run(spec.id, "rh-zakoni", spec.title, spec.short, citation, base.url, note, JSON.stringify({ amendments, unplaced: pendingBy.get("*") || [] }), now(), stored);
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  return { articles: ordered.filter((a) => !a.deleted).length, amendments: appliedActs.length, applied: appliedCount, pending: pendingCount };
}

/* ---------------- EU (Cellar) ---------------- */

async function ingestEU(spec) {
  const url = `http://publications.europa.eu/resource/celex/${spec.celex}`;
  const html = await get(url, { Accept: "application/xhtml+xml", "Accept-Language": "hrv" });
  const blocks = html.split(/<div[^>]+class="eli-subdivision"[^>]+id="art_/).slice(1);
  const articles = [];
  for (const block of blocks) {
    const number = block.match(/^(\d+[a-z]?)"/)?.[1];
    if (!number || articles.some((a) => a.number === number)) continue;
    const body = block.split(/<div[^>]+class="eli-subdivision"/)[0];
    const heading = clean(body.match(/class="oj-sti-art"[^>]*>([\s\S]*?)<\/p>/)?.[1] || "");
    const lines = paragraphs(body).map((p) => p.text).filter((t) => !/^Članak\s+\d+/.test(t) && t !== heading);
    // Collapse "(a)" list markers onto their text.
    const text = lines.join("\n").replace(/^(\([a-z0-9]+\)|\d+\.)\n/gm, "$1 ");
    if (text) articles.push({ number, heading, text });
  }
  if (!articles.length) {
    // Pre-2016 OJ layout: flat paragraphs with class "ti-art" / "sti-art" / "normal".
    const main = html.split(/class="(?:final|signatory|doc-end)"/)[0];
    const parts = main.split(/<p[^>]+class="ti-art"[^>]*>/).slice(1);
    for (const part of parts) {
      const number = clean(part.split("</p>")[0]).match(/^Članak\s+(\d+[a-z]?)/)?.[1];
      if (!number || articles.some((a) => a.number === number)) continue;
      const rest = part.slice(part.indexOf("</p>") + 4);
      const heading = clean(rest.match(/^\s*<p[^>]+class="sti-art"[^>]*>([\s\S]*?)<\/p>/)?.[1] || "");
      const lines = paragraphs(rest).map((p) => p.text).filter((t) => t !== heading);
      const text = lines.join("\n").replace(/^(\([a-z0-9]+\)|\d+\.)\n/gm, "$1 ");
      if (text) articles.push({ number, heading, text });
    }
  }
  if (!articles.length) throw new Error(`${spec.celex}: no articles parsed`);
  const officialUrl = `https://eur-lex.europa.eu/legal-content/HR/TXT/?uri=CELEX:${spec.celex}`;
  db.exec("BEGIN");
  try {
    deleteActUnits.run(spec.id);
    for (const a of articles) {
      insertUnit.run(`${spec.id}:${a.number}`, spec.id, "eu-propisi", "eu", spec.title, spec.short, `Članak ${a.number}.`, a.heading || null, a.text, officialUrl, null, null, null, null, null, null, null, "[]", now());
    }
    upsertAct.run(spec.id, "eu-propisi", spec.title, spec.short, `CELEX ${spec.celex}`, officialUrl, "Izvorni tekst objavljen u Službenom listu EU (hrvatska jezična verzija).", "[]", now(), articles.length);
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
  return { articles: articles.length };
}

/* ---------------- Court decisions ---------------- */

const LABELS = ["Broj odluke:", "Sud:", "Datum odluke:", "Pravomoćnost:", "Datum pravomoćnosti:", "Datum objave:", "Upisnik:", "Vrsta odluke:", "Prethodne odluke:", "ECLI broj:", "Stvarno kazalo:", "Zakonsko kazalo:", "Nomenklatura prava:"];
const STOP = /^(U svrhu pružanja boljeg korisničkog iskustva|Tražilica odluka sudova RH$|Metapodatci odluke$|Datum zadnjeg ažuriranja sustava)/;
const TEXT_START = /^(REPUBLIKA HRVATSKA|U IME REPUBLIKE|U I M E R E P U B L I K E)/;
function parseDecision(html, id) {
  const body = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, "");
  const lines = decode(body.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|dd|dt|h\d|tr)>/gi, "\n").replace(/<[^>]+>/g, "\n"))
    .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
  // Metadata can sit before or after the decision text depending on the page layout.
  const meta = {};
  for (let i = 0; i < lines.length; i++) {
    if (!LABELS.includes(lines[i])) continue;
    const key = lines[i].slice(0, -1);
    if (meta[key]) continue;
    const values = [];
    for (let j = i + 1; j < lines.length && !LABELS.includes(lines[j]) && !TEXT_START.test(lines[j]) && !STOP.test(lines[j]); j++) values.push(lines[j]);
    meta[key] = values;
  }
  const textStart = lines.findIndex((l) => TEXT_START.test(l));
  if (textStart < 0) return null;
  let end = lines.length;
  for (let i = textStart + 1; i < lines.length; i++) if (LABELS.includes(lines[i]) || STOP.test(lines[i])) { end = i; break; }
  const text = lines.slice(textStart, end).join("\n");
  const one = (k) => (meta[k] || []).join(" ").replace(/\s*,\s*$/, "").trim() || null;
  const dateRaw = one("Datum odluke");
  const dm = dateRaw?.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  const keywords = (meta["Stvarno kazalo"] || []).join(" · ");
  const statutes = (meta["Zakonsko kazalo"] || []).join(" ").replace(/\s+,\s+/g, ", ");
  return {
    id, ref: one("Broj odluke"), court: one("Sud")?.replace(/,$/, ""), decidedAt: dm ? `${dm[3]}-${dm[2].padStart(2, "0")}-${dm[1].padStart(2, "0")}` : null,
    type: one("Vrsta odluke"), finality: one("Pravomoćnost"), registry: one("Upisnik"), ecli: one("ECLI broj"), keywords, statutes, text,
  };
}

async function ingestCases() {
  const seen = new Set();
  let added = 0;
  for (const topic of CASE_TOPICS) {
    const list = await get(`https://odluke.sudovi.hr/Document/DisplayList?q=${encodeURIComponent(topic)}`);
    const ids = [...new Set([...list.matchAll(/\/Document\/View\?id=([0-9a-f-]{36})/g)].map((m) => m[1]))].filter((id) => !seen.has(id)).slice(0, perTopic);
    for (const id of ids) {
      seen.add(id);
      try {
        const d = parseDecision(await get(`https://odluke.sudovi.hr/Document/View?id=${id}`), id);
        if (!d?.ref || d.text.length < 400) continue;
        const unitId = `case:${d.ecli || id}`;
        deleteUnit.run(unitId);
        insertUnit.run(unitId, null, "rh-praksa", "case", d.court || "Sudska odluka", null, d.ref, d.keywords ? d.keywords.split(" · ").slice(-3).join(" · ") : null, d.text,
          `https://odluke.sudovi.hr/Document/View?id=${id}`, d.ecli, d.court, d.decidedAt, [d.type, d.finality].filter(Boolean).join(" · ") || null, d.registry, d.keywords || null, d.statutes || null, "[]", now());
        added++;
      } catch (error) {
        console.warn(`  ! decision ${id}: ${error.message}`);
      }
    }
    console.log(`  ✓ ${topic}: ${ids.length} decisions`);
  }
  upsertAct.run("odluke-sudovi", "rh-praksa", "Odluke sudova Republike Hrvatske", "Sudska praksa", "odluke.sudovi.hr", "https://odluke.sudovi.hr/",
    `Odabrane odluke prema ${CASE_TOPICS.length} tema; puni tekst i metapodatci.`, "[]", now(), db.prepare("SELECT COUNT(*) n FROM legal_units WHERE kind='case'").get().n);
  return { decisions: added };
}

/* ---------------- Court of Justice of the EU (Cellar) ---------------- */

const HR_MONTHS = ["siječnja", "veljače", "ožujka", "travnja", "svibnja", "lipnja", "srpnja", "kolovoza", "rujna", "listopada", "studenoga", "prosinca"];
function hrDate(text) {
  const m = text.match(/(\d{1,2})\.\s*([a-zčćđšž]+)\s+(\d{4})/i);
  const month = m ? HR_MONTHS.findIndex((x) => m[2].toLowerCase().startsWith(x.slice(0, 5))) : -1;
  return m && month >= 0 ? `${m[3]}-${String(month + 1).padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}
const CASE_TEXT_LIMIT = 60000;

async function ingestCJEU() {
  let added = 0;
  for (const spec of CJEU_CASES) {
    try {
      const html = await get(`http://publications.europa.eu/resource/celex/${spec.celex}`, { Accept: "application/xhtml+xml", "Accept-Language": "hrv" });
      const lines = paragraphs(html).map((p) => p.text);
      if (!/^PRESUDA/i.test(lines[0] ?? "")) throw new Error("nije pronađena presuda na hrvatskom jeziku");
      const decidedAt = hrDate(lines.slice(0, 3).join(" "));
      const subject = (lines.find((l) => /^„/.test(l)) ?? "").replace(/^„|[“”"]$/g, "");
      // Paragraph numbers sit in their own cell: "99" + text → "99. text".
      const body = [];
      for (let i = 0; i < lines.length; i++) {
        if (/^\d+$/.test(lines[i]) && lines[i + 1]) { body.push(`${lines[i]}. ${lines[i + 1]}`); i++; } else body.push(lines[i]);
      }
      const url = `https://eur-lex.europa.eu/legal-content/HR/TXT/?uri=CELEX:${spec.celex}`;
      const unitId = `cjeu:${spec.celex}`;
      deleteUnit.run(unitId);
      insertUnit.run(unitId, null, "eu-sud", "case", "Sud Europske unije", null, spec.ref, spec.name, body.join("\n").slice(0, CASE_TEXT_LIMIT), url,
        null, "Sud Europske unije", decidedAt, "Presuda", null, subject.split(/\s+[–—]\s+/).join(" · "), null, "[]", now());
      added++;
      console.log(`  ✓ ${spec.ref} ${spec.name}`);
    } catch (error) { console.warn(`  ✗ ${spec.ref}: ${error.message}`); }
  }
  upsertAct.run("sud-eu", "eu-sud", "Sud Europske unije — odabrane presude", "SEU", "Cellar / EUR-Lex", "https://curia.europa.eu/",
    "Odabrane presude Suda EU-a na hrvatskom jeziku (Ured za publikacije EU-a).", "[]", now(), added);
  return { judgments: added };
}

/* ---------------- European Court of Human Rights (HUDOC) ---------------- */

function echrName(docname) {
  const name = docname.replace(/^CASE OF\s+/i, "").replace(/\s+-\s+\[.*$/, "").trim()
    .replace(/\s+v\.\s+CROATIA/i, " protiv Hrvatske").replace(/\(No\.\s*(\d+)\)/i, "(br. $1)");
  return name.split(/(\s+)/).map((w) => (/^[A-ZČĆĐŠŽ][A-ZČĆĐŠŽ'-]+$/.test(w) ? w[0] + w.slice(1).toLowerCase() : w)).join("");
}

async function ingestECHR() {
  const query = encodeURIComponent('contentsitename:ECHR AND (respondent="HRV") AND (languageisocode="HRV") AND (documentcollectionid2="JUDGMENTS")');
  const select = "itemid,docname,appno,kpdate,ecli,article,conclusion,importance";
  const list = JSON.parse(await get(`https://hudoc.echr.coe.int/app/query/results?query=${query}&select=${select}&sort=kpdate%20Descending&start=0&length=200`));
  const relevant = list.results.map((r) => r.columns).filter((c) => (c.article ?? "").split(";").some((a) => ECHR_ARTICLES[a]));
  // Metadata only: the Croatian translations may be republished solely in HUDOC, so their text is not stored.
  // The unit describes the judgment; the lawyer opens the full text on HUDOC.
  db.prepare("DELETE FROM legal_units WHERE source = 'echr'").run();
  let added = 0;
  const seen = new Set();
  for (const c of relevant) {
    if (added >= ECHR_LIMIT) break;
    if (seen.has(c.appno)) continue;
    const articles = [...new Set((c.article ?? "").split(";").filter((a) => ECHR_ARTICLES[a]))];
    const conclusion = c.conclusion ?? "";
    const violated = articles.filter((a) => new RegExp(`(^|;)\\s*Violation of (Article ${a.replace("P1-1", "1 of Protocol No\\. 1")})\\b`, "i").test(conclusion));
    const outcome = violated.length ? "Utvrđena povreda" : /no violation/i.test(conclusion) ? "Nema povrede" : "";
    const name = echrName(c.docname);
    const date = c.kpdate ? c.kpdate.slice(0, 10) : null;
    const label = (a) => `čl. ${a === "P1-1" ? "1. Protokola br. 1" : `${a}.`} Konvencije (${ECHR_ARTICLES[a]})`;
    const text = [
      `Presuda Europskog suda za ljudska prava u predmetu ${name}, zahtjev br. ${c.appno}${date ? `, od ${date.split("-").reverse().join(".")}.` : "."}`,
      `Razmatrani članci: ${articles.map(label).join("; ")}.`,
      outcome ? `Ishod: ${outcome.toLowerCase()}${violated.length ? ` (${violated.map(label).join("; ")})` : ""}.` : "",
      "Puni tekst presude i hrvatski prijevod Ureda zastupnika dostupni su u bazi HUDOC.",
    ].filter(Boolean).join("\n");
    insertUnit.run(`echr:${c.itemid}`, null, "echr", "case", "Europski sud za ljudska prava", null, `${name}, br. ${c.appno}`,
      articles.map((a) => ECHR_ARTICLES[a]).join(" · "), text, `https://hudoc.echr.coe.int/hrv?i=${c.itemid}`, c.ecli || null,
      "Europski sud za ljudska prava", date, ["Presuda", outcome].filter(Boolean).join(" · "), null,
      articles.map((a) => ECHR_ARTICLES[a]).join(" · "), null, "[]", now());
    seen.add(c.appno);
    added++;
  }
  upsertAct.run("esljp-hr", "echr", "Europski sud za ljudska prava — presude protiv Hrvatske", "ESLJP", "HUDOC", "https://hudoc.echr.coe.int/",
    "Metapodatci presuda protiv Hrvatske (članci, ishod, datum). Hrvatske prijevode Ureda zastupnika dopušteno je objavljivati samo u bazi HUDOC pa se puni tekst otvara ondje.", "[]", now(), added);
  return { judgments: added };
}

/* ---------------- AZOP (azop.hr) ---------------- */

async function ingestAZOP() {
  const listing = await get(AZOP_LISTING);
  const links = new Map();
  for (const [, box] of listing.matchAll(/class=.et-box-content.>([\s\S]*?)<\/div>/g)) {
    for (const [, href, label] of box.matchAll(/<a href="(https:\/\/azop\.hr\/[a-z0-9-]+\/)">([\s\S]*?)<\/a>/g)) {
      if (!links.has(href)) links.set(href, clean(label).replace(/[,\s]+$/, ""));
    }
  }
  db.prepare("DELETE FROM legal_units WHERE source = 'azop'").run();
  let added = 0;
  for (const [href, label] of [...links].slice(0, AZOP_LIMIT)) {
    try {
      const html = (await get(href)).replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
      const title = clean(html.match(/<title>([^<]+)/)?.[1] ?? label).replace(/\s+-\s+Agencija za zaštitu osobnih podataka$/, "");
      const ps = [...html.matchAll(/<(p|h[1-4]|li)\b[^>]*>([\s\S]*?)<\/\1>/g)].map((m) => clean(m[2])).filter(Boolean);
      const start = ps.lastIndexOf(title);
      const body = [];
      for (const p of ps.slice(start + 1)) {
        if (/Selska cesta|Sva prava pridržana|Pratite nas|Kolačići|©/i.test(p)) break;
        body.push(p);
      }
      const text = body.join("\n");
      if (start < 0 || text.length < 400) continue;
      const published = text.match(/^Objavljeno\s+(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})/);
      const decidedAt = published ? `${published[3]}-${published[2].padStart(2, "0")}-${published[1].padStart(2, "0")}` : html.match(/"datePublished":"(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
      const slug = href.replace(/^https:\/\/azop\.hr\/|\/$/g, "");
      insertUnit.run(`azop:${slug}`, null, "azop", "case", "Agencija za zaštitu osobnih podataka", null, title.length > 90 ? `${title.slice(0, 88)}…` : title,
        label !== title ? label : null, text.slice(0, CASE_TEXT_LIMIT), href, null, "Agencija za zaštitu osobnih podataka", decidedAt,
        /mišljenj/i.test(text.slice(0, 300)) ? "Mišljenje" : "Rješenje", null, label, null, "[]", now());
      added++;
    } catch (error) { console.warn(`  ✗ ${href}: ${error.message}`); }
  }
  upsertAct.run("azop-rjesenja", "azop", "AZOP — objavljena rješenja", "AZOP", "azop.hr", AZOP_LISTING,
    "Rješenja koja je Agencija za zaštitu osobnih podataka objavila na svojim stranicama (anonimizirana).", "[]", now(), added);
  return { decisions: added };
}

/* ---------------- run ---------------- */

const started = Date.now();
if (only.has("statutes")) {
  console.log("Narodne novine:");
  for (const spec of STATUTES) {
    try { const r = await ingestStatute(spec); console.log(`  ✓ ${spec.short}: ${r.articles} članaka · ${r.amendments} akata izmjena · ${r.applied} članaka izmijenjeno · ${r.pending} uputa nije primijenjeno`); }
    catch (error) { console.warn(`  ✗ ${spec.short}: ${error.message}`); }
  }
}
if (only.has("eu")) {
  console.log("EU (Cellar):");
  for (const spec of EU_ACTS) {
    try { const r = await ingestEU(spec); console.log(`  ✓ ${spec.short}: ${r.articles} članaka`); }
    catch (error) { console.warn(`  ✗ ${spec.short}: ${error.message}`); }
  }
}
if (only.has("cases")) {
  console.log("Sudska praksa (odluke.sudovi.hr):");
  const r = await ingestCases();
  console.log(`  ✓ ${r.decisions} odluka`);
}
for (const [key, label, run] of [["cjeu", "Sud Europske unije (Cellar)", ingestCJEU], ["echr", "ESLJP (HUDOC)", ingestECHR], ["azop", "AZOP (azop.hr)", ingestAZOP]]) {
  if (!only.has(key)) continue;
  console.log(`${label}:`);
  try { const r = await run(); console.log(`  ✓ ${Object.values(r)[0]} odluka`); }
  catch (error) { console.warn(`  ✗ ${error.message}`); }
}
db.exec("INSERT INTO legal_fts(legal_fts) VALUES('optimize')");
const totals = db.prepare("SELECT kind, COUNT(*) n FROM legal_units GROUP BY kind").all();
console.log(`Done in ${Math.round((Date.now() - started) / 1000)} s →`, Object.fromEntries(totals.map((t) => [t.kind, t.n])), filename);
