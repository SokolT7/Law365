#!/usr/bin/env node
// Search-quality checks against the ingested legal store (run scripts/ingest-legal.mjs first).
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

if (!existsSync(process.env.LTB_LEGAL_DB_PATH || "data/legal.sqlite")) throw new Error("Run node scripts/ingest-legal.mjs first.");
const temp = mkdtempSync(path.join(tmpdir(), "ltb-legal-"));
const compile = (from, to, replace = []) => {
  let out = ts.transpileModule(readFileSync(from, "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
  for (const [a, b] of replace) out = out.replaceAll(a, b);
  writeFileSync(path.join(temp, to), out);
};
try {
  copyFileSync("src/lib/legal/schema.mjs", path.join(temp, "schema.mjs"));
  compile("src/lib/legal/text.ts", "text.mjs");
  compile("src/lib/legal/store.ts", "store.mjs", [["\"@/lib/legal/text\"", "\"./text.mjs\""]]);
  const { searchLegal, directReferences, toSourceRecord, legalStatus } = await import(pathToFileURL(path.join(temp, "store.mjs")));
  let checks = 0;
  const top = (q, kinds, n = 5) => searchLegal(q, kinds, n).map((h) => h.row.id);
  const expect = (q, kinds, id, within = 5) => { const ids = top(q, kinds, within); assert.ok(ids.includes(id), `"${q}" → expected ${id} in top ${within}, got ${ids.join(", ")}`); checks++; };

  assert.deepEqual(directReferences("Što kaže ZOR 116 o roku?"), [{ short: "ZOR", number: "116" }]); checks++;
  assert.deepEqual(directReferences("čl. 6. GDPR-a i članak 29 ZOO"), [{ short: "ZOO", number: "29" }, { short: "GDPR", number: "6" }]); checks++;
  assert.deepEqual(directReferences("čl. 17.a ZOR-a i ZOO 401a"), [{ short: "ZOR", number: "17a" }, { short: "ZOO", number: "401a" }]); checks++;

  expect("ZOR 116", ["statute"], "zor:116", 1);
  expect("rok za izvanredni otkaz ugovora o radu", ["statute"], "zor:116");
  expect("savjetovanje s radničkim vijećem prije otkaza", ["statute"], "zor:150");
  expect("zatezne kamate na novčane obveze", ["statute"], "zoo:29");
  expect("može li sud smanjiti previsoku ugovornu kaznu", ["statute"], "zoo:354", 2);
  { const ids = top("ugovorna kazna", ["statute"], 3); assert.ok(ids.every((id) => /^zoo:35[0-6]$|^zor:106$/.test(id)), `ugovorna kazna block: ${ids}`); checks++; }
  expect("zastara tražbina iz trgovačkih ugovora", ["statute"], "zoo:228");
  expect("rokovi i ročišta podnesak predan pošti", ["statute"], "zpp:113");
  expect("zakonitost obrade osobnih podataka privola", ["eu"], "gdpr:6");
  expect("nepoštena ugovorna odredba potrošač", ["eu"], "unfair-terms:3");
  { const ids = top("odgovornost članova uprave", ["statute"], 3); assert.ok(ids.some((id) => ["ztd:252", "ztd:430", "ztd:495"].includes(id)), `board liability: ${ids}`); checks++; }

  const cases = searchLegal("izvanredni otkaz rok od saznanja", ["case"], 5);
  assert.ok(cases.length >= 3, "case law hits"); checks++;
  const record = toSourceRecord(cases[0], 1, "izvanredni otkaz rok od saznanja");
  assert.match(record.label, /^(VSRH|VTSRH|ŽS|OS|TS|USRH)/); checks++;
  assert.ok(record.excerpt.length > 100 && record.excerpt.length <= 920); checks++;

  // Deterministic deadline arithmetic (ZPP čl. 112.) and citation verification.
  compile("src/lib/research/calculate.ts", "calculate.mjs");
  compile("src/lib/research/verify.ts", "verify.mjs");
  const { computeDeadline, croatianHolidays, detectDeadline } = await import(pathToFileURL(path.join(temp, "calculate.mjs")));
  const { verifyAnswer } = await import(pathToFileURL(path.join(temp, "verify.mjs")));
  const day = (iso) => new Date(`${iso}T00:00:00Z`);
  assert.equal(croatianHolidays(2026).get("2026-04-06"), "Uskrsni ponedjeljak"); checks++;
  assert.equal(croatianHolidays(2026).get("2026-06-04"), "Tijelovo"); checks++;
  { const c = computeDeadline(day("2026-12-10"), 15, "test"); assert.equal(c.end, "2026-12-25"); assert.equal(c.adjustedEnd, "2026-12-28"); checks++; }
  { const c = computeDeadline(day("2026-03-02"), 8, "test"); assert.equal(c.end, "2026-03-10"); assert.equal(c.adjustedEnd, undefined); checks++; }
  { const c = detectDeadline("Radnik je primio odluku 10.12.2026. Do kada teče rok od 15 dana za zaštitu prava?"); assert.equal(c?.adjustedEnd, "2026-12-28"); checks++; }
  { const c = detectDeadline("Saznali smo za povredu 3. ožujka 2026. — do kada je rok za izvanredni otkaz?", { label: "ZOR čl. 116.", text: "Ugovor o radu može se izvanredno otkazati samo u roku od petnaest dana od dana saznanja." }); assert.equal(c?.days, 15); assert.equal(c?.end, "2026-03-18"); checks++; }
  assert.equal(detectDeadline("Što je izvanredni otkaz?"), null); checks++;
  { const r = verifyAnswer("## Sažetak\n\nRok je petnaest dana od saznanja za činjenicu na kojoj se otkaz temelji [1][9]. Poslodavac se mora savjetovati s radničkim vijećem prije donošenja odluke [2].", 2);
    assert.deepEqual(r.verification.removedMarkers, ["[9]"]); assert.ok(!r.text.includes("[9]")); assert.equal(r.verification.citedSources, 2); assert.equal(r.verification.ok, false); checks++; }
  { const r = verifyAnswer("Ovo je dulja rečenica bez ikakvog citata koja iznosi pravnu tvrdnju o roku za otkaz ugovora.", 3); assert.equal(r.verification.uncitedParagraphs, 1); checks++; }

  // Consolidation engine: applying amending acts to articles.
  const { applyAmendment, orderedArticles } = await import(pathToFileURL(path.resolve("scripts/lib/consolidate.mjs")));
  {
    const art = (number, heading, lines) => [number, { number, heading, lines }];
    const arts = new Map([
      art("12", "Ugovor na određeno", ["(1) Stari tekst stavka 1.", "(2) Najdulje tri godine."]),
      art("14", "Primjerak ugovora", ["(1) Prvi stavak.", "(2) Drugi.", "(3) Treći.", "(4) Četvrti.", "(5) Peti stari.", "(6) Šesti.", "(7) Sedmi."]),
      art("16", "Sezonski poslovi", ["(1) Sezonski posao."]),
      art("20", "Plaća", ["(1) Plaća se isplaćuje u kunama do petnaestog dana."]),
      art("30", "Staro", ["(1) Ukida se."]),
    ]);
    const act = ["Članak 1.", "U Zakonu o radu (»Narodne novine«, br. 1/14.) članak 12. mijenja se i glasi:", "»(1) Novi tekst stavka 1.", "(2) Najdulje dvije godine.«",
      "Članak 2.", "U članku 14. stavak 5. mijenja se i glasi:", "»(5) Peti novi.«", "Iza stavka 5. dodaje se novi stavak 6. koji glasi:", "»(6) Umetnuti stavak.«", "Dosadašnji stavci 6. i 7. postaju stavci 7. i 8.",
      "Članak 3.", "Naslov iznad članka 16. mijenja se i glasi: »Stalni sezonski poslovi«.",
      "Članak 4.", "U članku 20. stavku 1. riječ: »kunama« zamjenjuje se riječju: »eurima«.",
      "Članak 5.", "Iza članka 20. dodaje se članak 20.a koji glasi:", "»Članak 20.a", "(1) Novi članak.«",
      "Članak 6.", "Članak 30. briše se.",
      "Članak 7.", "U članku 16. stavak 9. mijenja se i glasi:", "»(9) Ne postoji.«",
      "Članak 8.", "Ovaj Zakon stupa na snagu osmoga dana od dana objave."];
    const r = applyAmendment(arts, act, "NN 2/22");
    assert.deepEqual(arts.get("12").lines, ["(1) Novi tekst stavka 1.", "(2) Najdulje dvije godine."]); checks++;
    assert.deepEqual(arts.get("14").lines.slice(4), ["(5) Peti novi.", "(6) Umetnuti stavak.", "(7) Šesti.", "(8) Sedmi."]); checks++;
    assert.equal(arts.get("16").heading, "Stalni sezonski poslovi"); checks++;
    assert.match(arts.get("20").lines[0], /u eurima do/); checks++;
    assert.deepEqual(arts.get("20a")?.lines, ["(1) Novi članak."]); checks++;
    assert.ok(arts.get("30").deleted); checks++;
    assert.equal(r.pending.length, 1); assert.equal(r.pending[0].article, "16"); checks++;
    assert.deepEqual(orderedArticles(arts).map((a) => a.number), ["12", "14", "16", "20", "20a", "30"]); checks++;
  }
  {
    // Items (točke), lettered article refs, inserts with headings inside quotes, heading+article deletion, sentences.
    const art = (number, heading, lines) => [number, { number, heading, lines }];
    const arts = new Map([
      art("5", "Pojmovi", ["(1) Pojedini pojmovi znače:", "1. prvi pojam", "2. drugi pojam", "3. treći pojam", "(2) Ostalo."]),
      art("7", "Stari", ["(1) Brisati."]),
      art("9", "Rok", ["(1) Rok je osam dana."]),
      art("9a", "Umetnuti", ["(1) Stari tekst."]),
    ]);
    const act = ["Članak 1.", "U članku 5. stavku 1. točka 2. mijenja se i glasi:", "»2. novi drugi pojam«.", "Točka 3. briše se.",
      "Članak 2.", "Naslov iznad članka 7. i članak 7. brišu se.",
      "Članak 3.", "Članak 9.a mijenja se i glasi:", "»Članak 9.a", "(1) Novi tekst.«",
      "Članak 4.", "Iza članka 9. dodaje se članak 9.b s naslovom iznad njega koji glase:", "»Novi rok", "Članak 9.b", "(1) Umetnut članak.«",
      "Članak 5.", "U članku 9. stavku 1. dodaje se druga rečenica koja glasi: »Rok se ne može produljiti.«"];
    const r = applyAmendment(arts, act, "NN 3/23");
    assert.deepEqual(arts.get("5").lines, ["(1) Pojedini pojmovi znače:", "1. prvi pojam", "2. novi drugi pojam", "(2) Ostalo."]); checks++;
    assert.ok(arts.get("7").deleted); checks++;
    assert.deepEqual(arts.get("9a").lines, ["(1) Novi tekst."]); checks++;
    assert.equal(arts.get("9b")?.heading, "Novi rok"); assert.deepEqual(arts.get("9b").lines, ["(1) Umetnut članak."]); checks++;
    assert.equal(arts.get("9").lines[0], "(1) Rok je osam dana. Rok se ne može produljiti."); checks++;
    assert.equal(r.pending.length, 0, JSON.stringify(r.pending)); checks++;
  }

  // Consolidated texts: inserted articles exist, amendments are recorded, section labels are clean.
  { const hits = searchLegal("ZOO 401a ažuriranje stvari s digitalnim elementima", ["statute"], 3); assert.ok(hits.some((h) => h.row.id === "zoo:401a"), "inserted article zoo:401a"); checks++; }
  { const r = toSourceRecord(searchLegal("ZOO 401a ažuriranje", ["statute"], 1)[0], 1, "ažuriranje"); assert.deepEqual(r.consolidatedWith, ["NN 126/21"]); checks++; }
  { const hit = searchLegal("ZTD 252", ["statute"], 1)[0]; assert.equal(hit.row.id, "ztd:252"); assert.ok(!/\n/.test(hit.row.keywords ?? "") && /Uprava/.test(hit.row.keywords ?? ""), `ztd:252 section: ${hit.row.keywords}`); checks++; }

  // Source filter: CJEU, ECtHR and AZOP are "case" units but never leak into each other or into RH case law.
  for (const source of ["eu-sud", "echr", "azop", "rh-praksa"]) {
    const hits = searchLegal("zaštita osobnih podataka naknada štete", ["case"], 5, [], [source]);
    assert.ok(hits.every((h) => h.row.source === source), `${source} filter`); checks++;
  }
  expect("prijenos osobnih podataka u SAD", ["case"], "cjeu:62014CJ0362", 3);
  { const r = toSourceRecord(searchLegal("pošteno suđenje", ["case"], 1, [], ["echr"])[0], 1, "pošteno suđenje"); assert.match(r.label, /^ESLJP .+ protiv Hrvatske/); checks++; }

  const statuses = legalStatus();
  for (const source of ["rh-zakoni", "rh-praksa", "eu-propisi", "eu-sud", "echr", "azop"]) { assert.ok(statuses.some((s) => s.sourceId === source && s.units > 0), `${source} populated`); checks++; }
  console.log(`${checks} legal search, deadline and verification checks passed.`);
} finally {
  rmSync(temp, { recursive: true, force: true });
}
