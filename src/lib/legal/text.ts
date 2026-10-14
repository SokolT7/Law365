/** Croatian-aware text helpers shared by legal and firm-document search. */

export function fold(value: string): string {
  return value.toLocaleLowerCase("hr").replace(/đ/g, "d").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const STOP = new Set([
  "i", "u", "na", "za", "se", "je", "su", "od", "do", "a", "o", "s", "sa", "te", "ili", "ako", "sto", "koji", "koja", "koje", "kojeg", "kojem",
  "ovaj", "ova", "ovo", "taj", "to", "li", "da", "ne", "biti", "bi", "kao", "kod", "po", "pri", "prema", "iz", "sve", "svi", "moze", "mora",
  "kada", "kad", "kako", "gdje", "koliko", "zasto", "jesu", "nije", "ima", "imaju", "the", "of", "and", "clanak", "clanka", "clanku", "cl", "st", "stavak",
  // Drafting instructions in research prompts say what to produce, not what to find.
  "izradi", "izraditi", "detaljan", "detaljno", "detaljnu", "navedi", "navesti", "naglaskom", "posebnim", "posebno", "tablici", "tablicom", "tablicu", "objasni",
  "prikazi", "opisi", "hodogram", "pregled", "koraci", "korake", "analiziraj", "usporedi", "sazetak", "molim", "relevantnu", "relevantne", "relevantni", "praksu",
  "odnosi", "koje", "koju", "kojim", "kojima", "posljedice", "uvjeti", "uvjete", "prava", "pravu", "pravo", "obveze",
  // Dates in questions identify a case, not the law: months are never search terms.
  "sijecnja", "veljace", "ozujka", "travnja", "svibnja", "lipnja", "srpnja", "kolovoza", "rujna", "listopada", "studenoga", "studenog", "prosinca", "godine", "saznali", "smo",
]);

// Longest first. Light stemming: enough to match inflected Croatian forms with a prefix query.
const SUFFIXES = ["ovima", "evima", "anjem", "enjem", "ijama", "ovanje", "ivanje", "anja", "enja", "nost", "ama", "ima", "ovi", "evi", "oga", "ome", "emu", "om", "em", "og", "oj", "ih", "im", "ju", "a", "e", "i", "o", "u"];

export function stem(token: string): string {
  let out = token;
  for (const suffix of SUFFIXES) {
    if (out.endsWith(suffix) && out.length - suffix.length >= 4) { out = out.slice(0, -suffix.length); break; }
  }
  // Croatian derivation varies the stem tail (zastara/zastarijevati, otkaz/otkazivati): keep a 6-letter root for long words.
  return out.length > 7 ? out.slice(0, 6) : out;
}

/** Legal vocabulary that differs between how lawyers ask and how statutes are written. Keys and values are stems. */
const SYNONYMS: Record<string, string[]> = {
  potraz: ["trazb"], trazb: ["potraz"], otkaz: ["prestan", "raskid"], raskid: ["otkaz"], zakup: ["najam", "zakupn"], najam: ["zakup"],
  radnik: ["zaposl"], zaposl: ["radnik"], poslodav: ["poslod"], kazn: ["penal"], penal: ["kazn"], stet: ["naknad"], odgovor: ["odgovorn"],
  kamat: ["zatezn"], zastar: ["zastarn"], uprav: ["direktor"], direktor: ["uprav"], osobn: ["podat"], podat: ["osobn"],
};
export function synonyms(stemmed: string): string[] {
  return SYNONYMS[stemmed] ?? [];
}

export function terms(query: string): string[] {
  // Numbers (dates, amounts, article numbers) are handled by direct-reference lookup, not full-text terms.
  return [...new Set(fold(query).replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((t) => t.length > 2 && !STOP.has(t) && !/^\d+$/.test(t)).map(stem))];
}

/** Picks the passage that covers the most query terms (for excerpts and evidence highlighting). */
export function bestPassage(text: string, queryTerms: string[], max = 700): string {
  const clean = text.replace(/[ \t]+/g, " ").trim();
  if (clean.length <= max || !queryTerms.length) return clean.length <= max ? clean : `${clean.slice(0, max).replace(/\s+\S*$/, "")}…`;
  const folded = fold(clean);
  const lines = clean.split("\n");
  let best = { score: -1, start: 0 };
  let offset = 0;
  for (let i = 0; i < lines.length; i++) {
    // Score a window of a few lines starting here.
    const window = folded.slice(offset, offset + max);
    const score = queryTerms.reduce((n, t) => n + (window.includes(t) ? 1 : 0), 0);
    if (score > best.score) best = { score, start: offset };
    offset += lines[i].length + 1;
  }
  const slice = clean.slice(best.start, best.start + max).replace(/\s+\S*$/, "");
  return `${best.start > 0 ? "…" : ""}${slice}${best.start + max < clean.length ? "…" : ""}`;
}
