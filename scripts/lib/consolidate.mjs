// Applies Croatian amending acts ("Zakon o izmjenama i dopunama …") to a base statute.
// Articles are { number, heading, lines[] }. Paragraphs (stavci) are either numbered "(n)" or,
// in older laws, one per line; enumerated items (točke "1.", "a)", "–") stay with their paragraph.
// Every instruction is either applied or reported as pending; nothing is guessed.

// "Članak 20." and inserted "Članak 20.a" / "Članak 20a."
export const ARTICLE_LINE = /^Članak\s+(\d+)\.?\s*([a-z])?\.?\s*$/i;
export const articleNo = (m) => `${m[1]}${(m[2] ?? "").toLowerCase()}`;
// Article reference inside a sentence: "članka 12.", "članku 12.a", "članak 12a." (the letter stands alone).
const A = "(\\d+\\.?(?:\\s?[a-z](?![a-zčćđšž]))?)";
const norm = (s) => s.replace(/[.\s]/g, "").toLowerCase();
const INSTRUCTION = /(mijenja se|mijenjaju se|dodaje se|dodaju se|briše se|brišu se|zamjenjuj[eu] se|stavlja se)/i;
const OPEN = /^[»„"]/;
const CLOSE = /[«“"]\.?\s*$/;
const ITEM = /^(\d+[a-z]?\.|[a-zčćđšž]\)|\d+\)|[–-])\s/;
const CONTEXT = new RegExp(`^(?:U\\s+Zakonu[^)]*\\)\\s*,?\\s*)?(?:U\\s+|Iza\\s+|Ispred\\s+|Naslov\\w*\\s+iznad\\s+|U\\s+naslovu\\s+iznad\\s+)?član(?:ak|ku|ka|ci)\\s+${A}`, "i");

/** Groups article lines into paragraphs. */
export function toParagraphs(lines) {
  const numberedText = lines.some((l) => /^\(\d+[a-z]?\)/.test(l));
  const paras = [];
  for (const line of lines) {
    const starts = numberedText ? /^\(\d+[a-z]?\)/.test(line) : !ITEM.test(line);
    if (starts || !paras.length) paras.push([line]);
    else paras[paras.length - 1].push(line);
  }
  return paras;
}
const isNumbered = (paras) => paras.length > 0 && paras.every((p) => /^\(\d+[a-z]?\)/.test(p[0]));
function renumber(paras) {
  if (!isNumbered(paras)) return paras;
  return paras.map((p, i) => [p[0].replace(/^\(\d+[a-z]?\)/, `(${i + 1})`), ...p.slice(1)]);
}
/** Paragraph index (0-based) for "stavak N"; unnumbered articles count one paragraph per line. */
function paraIndex(paras, n) {
  if (isNumbered(paras)) return paras.findIndex((p) => p[0].startsWith(`(${n})`));
  const i = Number(n) - 1;
  return i >= 0 && i < paras.length ? i : -1;
}
/** Line index of item (točka) "3." / "3.a" / "c)" inside a paragraph. */
function itemIndex(para, n) {
  const key = norm(n.replace(")", ""));
  return para.findIndex((line) => { const m = line.match(/^(\d+\.?[a-z]?|[a-zčćđšž])[.)]\s/); return !!m && norm(m[1]) === key; });
}

/** Reads quoted text starting at lines[i]; returns { quote: string[], next } or null. */
function readQuote(lines, i) {
  if (i >= lines.length || !OPEN.test(lines[i])) return null;
  const quote = [];
  for (let j = i; j < lines.length; j++) {
    const line = j === i ? lines[j].replace(OPEN, "") : lines[j];
    const closes = CLOSE.test(line) && !/[«“"]\s*[,;]?\s*[^.«“"]+$/.test(line);
    if (closes) { quote.push(line.replace(/[«“"]\.?\s*$/, "").trim()); return { quote: quote.filter(Boolean), next: j + 1 }; }
    quote.push(line.trim());
  }
  return null;
}
/** Quote on the instruction line itself: "… glasi: »tekst«." */
const inlineQuote = (line) => line.match(/glas[ie]:?\s*[»„](.+)[«“]\.?\s*$/)?.[1];

/** Splits a quoted block that contains whole articles ("Članak 12.a" lines) into article objects. */
function quotedArticles(quote) {
  const out = [];
  let heading = "";
  for (let k = 0; k < quote.length; k++) {
    const m = quote[k].match(ARTICLE_LINE);
    if (m) { out.push({ number: articleNo(m), heading, lines: [] }); heading = ""; continue; }
    if (!out.length || (ARTICLE_LINE.test(quote[k + 1] ?? "") && !/[.;:]$/.test(quote[k]))) { heading = heading ? `${heading} ${quote[k]}` : quote[k]; continue; }
    out[out.length - 1].lines.push(quote[k]);
  }
  return out;
}

const WORD = "(?:riječ\\w*|broj\\w*|brojk\\w*|izraz\\w*|znak\\w*|tekst\\w*)";
function replaceWords(text, sentence) {
  let changed = false;
  let out = text;
  const has = (a) => a && out.includes(a);
  for (const [, a, b] of sentence.matchAll(new RegExp(`${WORD}:?\\s*[»„]([^«“]*)[«“]\\s*zamjenjuj\\w*\\s+se\\s+(?:${WORD})?:?\\s*[»„]([^«“]*)[«“]`, "gi"))) if (has(a)) { out = out.split(a).join(b); changed = true; }
  for (const [, a, comma, b] of sentence.matchAll(new RegExp(`iza\\s+${WORD}:?\\s*[»„]([^«“]*)[«“]\\s*dodaj\\w*\\s+se\\s+(zarez\\s+i\\s+)?(?:${WORD})?:?\\s*[»„]([^«“]*)[«“]`, "gi"))) {
    if (has(a)) { const add = comma ? `, ${b}` : /^[,.;:)]/.test(b) ? b : ` ${b}`; out = out.split(a).join(`${a}${add}`); changed = true; }
  }
  for (const [, a, b] of sentence.matchAll(new RegExp(`ispred\\s+${WORD}:?\\s*[»„]([^«“]*)[«“]\\s*dodaj\\w*\\s+se\\s+(?:${WORD})?:?\\s*[»„]([^«“]*)[«“]`, "gi"))) if (has(a)) { out = out.split(a).join(`${b} ${a}`); changed = true; }
  for (const [, a] of sentence.matchAll(new RegExp(`${WORD}:?\\s*[»„]([^«“]*)[«“]\\s*briš\\w*\\s+se`, "gi"))) if (has(a)) { out = out.split(a).join("").replace(/[ \t]{2,}/g, " ").replace(/\s+([,.;])/g, "$1"); changed = true; }
  return { text: out, changed };
}

/**
 * Applies one amending act to `articles` (Map number→article, mutated).
 * Returns { applied: Set<number>, pending: [{ article, text, citation }] }.
 */
export function applyAmendment(articles, actLines, citation) {
  const applied = new Set();
  const pending = [];
  const fail = (article, text) => pending.push({ article: article ?? null, text: text.slice(0, 300), citation });
  // Split the amending act into its own articles ("Članak 1.", "Članak 2." …); article lines inside quoted
  // new text ("»… Članak 401.a …«") belong to the quote, not to the act.
  const blocks = [];
  let inQuote = false;
  for (const line of actLines.flatMap((l) => l.split("\n"))) {
    if (!inQuote && ARTICLE_LINE.test(line)) { blocks.push([]); continue; }
    if (blocks.length) blocks[blocks.length - 1].push(line);
    const closes = CLOSE.test(line) && !/[«“"]\s*[,;]?\s*[^.«“"]+$/.test(line);
    if (!inQuote && OPEN.test(line)) inQuote = !closes;
    else if (inQuote && closes) inQuote = false;
  }
  const get = (n) => (n ? articles.get(n) : undefined);

  for (const block of blocks) {
    let current = null; // article the instructions refer to
    let stavak = null;  // paragraph context ("U članku 5. stavku 2. …" followed by "Točka 3. …")
    for (let i = 0; i < block.length; i++) {
      const line = block[i];
      if (OPEN.test(line)) continue; // stray quote (consumed below when expected)
      const ctx = line.match(CONTEXT);
      if (ctx) { current = norm(ctx[1]); stavak = null; }
      const becomes = line.match(/postaje\s+stavak\s+(\d+)\./i);
      const st = line.match(/stavk[ua]\s+(\d+)\./i);
      if (becomes) stavak = becomes[1]; else if (st && /^U\s+(članku|stavku|dosadašnjem)/i.test(line)) stavak = st[1];
      if (!INSTRUCTION.test(line)) continue;
      if (/^Dosadašnj\w+\s+(stav|toč|član|podstav)\w*/i.test(line) && /postaj/i.test(line) && !/[»„]|doda/i.test(line)) continue; // renumbering note: automatic

      let m;
      // Article heading changed.
      if ((m = line.match(new RegExp(`naslov\\w*\\s+iznad\\s+članka\\s+${A}\\s+mijenja\\s+se\\s+i\\s+glasi:?\\s*[»„]([^«“]+)[«“]`, "i")))) {
        const a = get(norm(m[1])); if (a) { a.heading = m[2].trim(); applied.add(a.number); } else fail(norm(m[1]), line);
        continue;
      }
      // Whole articles deleted (optionally with their heading): "Članak 5. briše se." / "Članci 5. i 6." / "5. do 8." /
      // "Naslov iznad članka 5. i članak 5. brišu se." / "Naslov iznad članka i članak 5. brišu se."
      if ((m = line.match(new RegExp(`^(?:Naslov\\w*\\s+iznad\\s+član\\w*(?:\\s+${A})?\\s+i\\s+)?član(?:ak|ci)\\s+((?:\\d+\\.?(?:\\s?[a-z](?![a-zčćđšž]))?\\s*(?:,|i|do)?\\s*)+)briš[eu]\\s+se`, "i"))) && !/stav|toč/i.test(line)) {
        const list = m[2];
        const range = list.match(/(\d+)\.?\s*do\s+(\d+)/);
        const nums = range
          ? Array.from({ length: Math.max(0, Number(range[2]) - Number(range[1]) + 1) }, (_, x) => String(Number(range[1]) + x))
          : [...list.matchAll(/(\d+\.?(?:\s?[a-z](?![a-zčćđšž]))?)/g)].map((x) => norm(x[1]));
        for (const n of nums) { const a = get(n); if (a) { a.deleted = true; a.lines = ["(brisan)"]; applied.add(n); } else fail(n, line); }
        continue;
      }
      // Whole article replaced (with or without a new heading).
      if ((m = line.match(new RegExp(`član(?:ak)\\s+${A}(?:\\s+i\\s+naslov\\s+iznad\\s+njega)?\\s+mijenja(?:ju)?\\s+se\\s+i\\s+glas[ie]:?\\s*$`, "i")))) {
        const q = readQuote(block, i + 1);
        const a = get(norm(m[1]));
        if (q && a) {
          const parts = quotedArticles(q.quote);
          a.lines = parts.length ? parts[0].lines : q.quote.filter((l) => !ARTICLE_LINE.test(l));
          if (parts[0]?.heading) a.heading = parts[0].heading;
          a.deleted = false; applied.add(a.number); i = q.next - 1;
        } else { fail(norm(m[1]), line); if (q) i = q.next - 1; }
        continue;
      }
      // New articles after an anchor: "Iza članka 12. dodaje se (naslov iznad članka i) članak 12.a (s naslovom iznad njega) koji glasi:"
      if ((m = line.match(new RegExp(`^Iza\\s+članka\\s+${A}\\s+doda(?:je|ju)\\s+se`, "i"))) && /član(?:ak|ci)/i.test(line.slice(m[0].length)) && /glas[ie]:?\s*$/i.test(line)) {
        const q = readQuote(block, i + 1);
        const after = norm(m[1]);
        if (q) {
          const parts = quotedArticles(q.quote);
          const named = [...line.slice(m[0].length).matchAll(/(\d+\.?\s?[a-z])(?![a-zčćđšž])/g)].map((x) => norm(x[1]));
          const list = parts.length ? parts : [{ number: named[0] ?? `${after}a`, heading: "", lines: q.quote }];
          for (const p of list) { articles.set(p.number, { number: p.number, heading: p.heading, lines: p.lines, inserted: true, after }); applied.add(p.number); }
          i = q.next - 1;
        } else fail(after, line);
        continue;
      }

      const target = get(current);
      const paras = target ? toParagraphs(target.lines) : [];
      const commit = (next) => { target.lines = next.flat(); applied.add(target.number); };
      const takeQuote = () => { const inl = inlineQuote(line); return inl ? { quote: [inl], next: i + 1 } : readQuote(block, i + 1); };
      const stavakOf = () => becomes?.[1] ?? line.match(/stavk[ua]\s+(\d+)\./i)?.[1] ?? stavak;

      // Items (točke) inside a paragraph: replace, delete, insert after.
      const item = line.match(/(?:^|\s)točk[ae]\s+(\d+\.?[a-z]?|[a-zčćđšž]\))\.?\s+(mijenja\s+se\s+i\s+glasi|briše\s+se)/i)
        || line.match(/(?:^|\s)[Ii]za\s+točke\s+(\d+\.?[a-z]?|[a-zčćđšž]\))\.?\s+doda(?:je|ju)\s+se\s+(?:nova\s+)?točk/i);
      if (item && !/riječ|zarez|točka\s+sa\s+zarezom|umjesto/i.test(line.replace(/točk[ae]\s+\S+\s+mijenja.*$/i, ""))) {
        const sn = stavakOf();
        const pi = sn ? paraIndex(paras, sn) : paras.findIndex((p) => itemIndex(p, item[1]) >= 0);
        const para = pi >= 0 ? paras[pi] : null;
        const ii = para ? itemIndex(para, item[1]) : -1;
        if (target && para && ii >= 0) {
          if (/briše/i.test(item[2] ?? "")) { para.splice(ii, 1); commit(paras); continue; }
          const q = takeQuote();
          if (q) { para.splice(/iza/i.test(item[0]) ? ii + 1 : ii, /iza/i.test(item[0]) ? 0 : 1, ...q.quote); commit(paras); i = q.next - 1; continue; }
        }
        fail(current, line); const q = /glas[ie]:?\s*$/i.test(line) ? readQuote(block, i + 1) : null; if (q) i = q.next - 1; continue;
      }
      // Paragraph(s) replaced.
      if ((m = line.match(/stav(?:ak|ci)\s+(\d+)\.(?:\s*(?:i|,)\s*(\d+)\.)?\s+mijenja(?:ju)?\s+se\s+i\s+glas[ie]:?/i))) {
        const q = takeQuote();
        const idx = target ? paraIndex(paras, m[1]) : -1;
        if (q && idx >= 0) { paras.splice(idx, m[2] ? Number(m[2]) - Number(m[1]) + 1 : 1, ...toParagraphs(q.quote)); commit(renumber(paras)); i = q.next - 1; continue; }
        fail(current, line); if (q) i = q.next - 1; continue;
      }
      // Paragraph(s) inserted after N ("iza (dosadašnjeg) stavka 2.(, koji postaje stavak 3.,) dodaje se (novi) stavak 3.").
      if ((m = line.match(/iza\s+(?:dosadašnjeg\s+)?stavka\s+(\d+)\.(?:,?\s*koji\s+postaje\s+stavak\s+(\d+)\.,?)?\s+doda(?:je|ju)\s+se\s+(?:novi\s+|nov\w+\s+)?stav(?:ak|ci)/i))) {
        const q = takeQuote();
        const idx = target ? paraIndex(paras, m[1]) : -1; // renumbering happens after the insert, so the old number is the anchor
        if (q && idx >= 0) { paras.splice(idx + 1, 0, ...toParagraphs(q.quote)); commit(renumber(paras)); i = q.next - 1; continue; }
        fail(current, line); if (q) i = q.next - 1; continue;
      }
      // Paragraph(s) appended at the end of the article.
      if (/doda(?:je|ju)\s+se\s+(?:novi\s+|nov\w+\s+)?stav(?:ak|ci)/i.test(line) && !/iza\s+stavka|ispred/i.test(line)) {
        const q = takeQuote();
        if (q && target) { paras.push(...toParagraphs(q.quote)); commit(renumber(paras)); i = q.next - 1; continue; }
        fail(current, line); if (q) i = q.next - 1; continue;
      }
      // Paragraph(s) deleted.
      if ((m = line.match(/stav(?:ak|ci)\s+(\d+)\.(?:\s*(?:i|do)\s*(\d+)\.)?\s+briš[eu]\s+se/i)) && !/riječ|toč|[»„]/i.test(line)) {
        const idx = target ? paraIndex(paras, m[1]) : -1;
        if (idx >= 0) { paras.splice(idx, m[2] ? Number(m[2]) - Number(m[1]) + 1 : 1); commit(renumber(paras)); continue; }
        fail(current, line); continue;
      }
      // A sentence appended to (or replacing) part of a paragraph: "U stavku 2. dodaje se druga rečenica koja glasi:"
      if (/doda(?:je|ju)\s+se\s+(?:nova\s+)?(?:druga|treća|četvrta|peta|nova)?\s*rečenic/i.test(line) && !/iza\s+(prve|druge|treće)/i.test(line)) {
        const q = takeQuote();
        const sn = stavakOf();
        const idx = target ? (sn ? paraIndex(paras, sn) : paras.length === 1 ? 0 : -1) : -1;
        if (q && idx >= 0) { const p = paras[idx]; p[p.length - 1] = `${p[p.length - 1].replace(/\s+$/, "")} ${q.quote.join(" ")}`; commit(paras); i = q.next - 1; continue; }
        fail(current, line); if (q) i = q.next - 1; continue;
      }
      // Word / number changes: whole act or the current article / paragraph.
      if (/[»„]/.test(line) && /(riječ|broj|izraz|znak|tekst)/i.test(line)) {
        if (/u\s+cijelom\s+tekstu/i.test(line)) {
          let any = false;
          for (const a of articles.values()) { const r = replaceWords(a.lines.join("\n"), line); if (r.changed) { a.lines = r.text.split("\n"); applied.add(a.number); any = true; } }
          if (!any) fail(null, line);
          continue;
        }
        if (target) {
          const sn = stavakOf();
          const idx = sn ? paraIndex(paras, sn) : -1;
          const r = replaceWords(idx >= 0 ? paras[idx].join("\n") : target.lines.join("\n"), line);
          if (!r.changed && idx >= 0) {
            // The paragraph number may refer to the text before this act's own renumbering; fall back to the article.
            const whole = replaceWords(target.lines.join("\n"), line);
            if (whole.changed) { target.lines = whole.text.split("\n"); applied.add(target.number); continue; }
          }
          if (r.changed) { if (idx >= 0) { paras[idx] = r.text.split("\n"); commit(paras); } else { target.lines = r.text.split("\n"); applied.add(target.number); } continue; }
        }
        fail(current, line); continue;
      }
      // Recognised as an instruction but not a form we apply automatically.
      fail(current, line);
    }
  }
  return { applied, pending };
}

/** Orders articles by number, placing inserted articles (12a, 12b) after their anchor. */
export function orderedArticles(articles) {
  const key = (n) => { const m = String(n).match(/^(\d+)([a-z]?)$/); return m ? Number(m[1]) * 100 + (m[2] ? m[2].charCodeAt(0) - 96 : 0) : 0; };
  return [...articles.values()].sort((a, b) => key(a.number) - key(b.number));
}
