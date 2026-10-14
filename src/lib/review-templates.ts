import type { Chunk } from "@/lib/types";

/**
 * Template-driven contract review: template → topics → (question, criteria).
 * Evaluation is deterministic: each criterion is searched for in the document's passages and
 * the matching passage is quoted, so every result can be checked by the lawyer.
 */

export interface ReviewCriterion {
  label: string;
  /** Vetted patterns over diacritic-free lowercase text (built-in templates only). */
  patterns?: string[];
  /** Firm-entered words or phrases; `*` is a word-ending wildcard. Converted to safe patterns. */
  keywords?: string[];
}
export interface ReviewTopic { id: string; title: string; question: string; importance: "visoka" | "srednja" | "niska"; criteria: ReviewCriterion[]; recommendation: string; basis?: string }
export interface ReviewTemplate {
  id: string; name: string; description: string;
  /** Detects suitable documents (diacritic-free patterns). */
  detect: string[];
  /** Firm templates: detection keywords (converted like criterion keywords). */
  detectKeywords?: string[];
  topics: ReviewTopic[];
  builtIn?: boolean;
  createdBy?: string;
  updatedAt?: string;
}

export type TopicStatus = "obuhvaceno" | "djelomicno" | "nedostaje";
export interface CriterionResult { label: string; found: boolean; quote?: string; chunkId?: string; heading?: string }
export interface TopicResult { topic: ReviewTopic; status: TopicStatus; criteria: CriterionResult[] }

const fold = (s: string) => s.toLocaleLowerCase("hr").replace(/đ/g, "d").normalize("NFD").replace(/[̀-ͯ]/g, "");

const IDENTITY: ReviewTopic = {
  id: "strane", title: "Ugovorne strane i osnovni podaci", importance: "visoka",
  question: "Jesu li ugovorne strane i osnovni podaci ugovora jasno navedeni?",
  criteria: [
    { label: "Nazivi ugovornih strana", patterns: ["d\\.o\\.o\\.|d\\.d\\.|obrt|naruc|izvrsitelj|zakupodav|najmodav|poslodav|davatelj"] },
    { label: "OIB ugovornih strana", patterns: ["\\boib\\b"] },
    { label: "Datum i mjesto sklapanja", patterns: ["(sklopljen|zakljucen)\\w*.{0,60}(dana|\\d{1,2}\\.)|u [a-z]+u,? (dana )?\\d{1,2}\\. ?(\\d{1,2}\\.|[a-z]+ )"] },
  ],
  recommendation: "Navesti puni naziv, sjedište i OIB svake strane te datum i mjesto sklapanja.",
};
const TERMINATION: ReviewTopic = {
  id: "raskid", title: "Prestanak i raskid ugovora", importance: "visoka",
  question: "Kada i kako stranke mogu prestati ugovor?",
  criteria: [
    { label: "Otkaz i otkazni rok", patterns: ["otkaz\\w* rok|otkaznog roka|otkazati"] },
    { label: "Razlozi za izvanredni raskid", patterns: ["raskid|izvanredn\\w* otkaz|bitn\\w* povred"] },
    { label: "Oblik obavijesti o prestanku", patterns: ["pisan\\w* (obavijest|izjav|otkaz)|preporucen\\w* posiljk"] },
  ],
  recommendation: "Urediti otkazni rok, razloge za raskid zbog bitne povrede i pisani oblik obavijesti.",
  basis: "ZOO čl. 212.–214. (raskid zbog neispunjenja)",
};
const DISPUTES: ReviewTopic = {
  id: "sporovi", title: "Mjerodavno pravo i rješavanje sporova", importance: "srednja",
  question: "Je li određeno mjerodavno pravo i nadležnost za sporove?",
  criteria: [
    { label: "Mjerodavno pravo", patterns: ["mjerodavn\\w* pravo|primjenjuje se pravo republike hrvatske|hrvatsko pravo"] },
    { label: "Nadležni sud ili arbitraža", patterns: ["nadlezan|nadleznost|stvarno nadlezn|arbitraz"] },
  ],
  recommendation: "Ugovoriti hrvatsko mjerodavno pravo i mjesno nadležan sud (ili arbitražu).",
  basis: "Uredba Rim I, čl. 3. · Uredba Bruxelles I.a, čl. 25.",
};
const AMENDMENTS: ReviewTopic = {
  id: "izmjene", title: "Izmjene i cjelovitost ugovora", importance: "niska",
  question: "Moraju li izmjene biti u pisanom obliku?",
  criteria: [{ label: "Pisani oblik izmjena", patterns: ["izmjen\\w*.{0,60}pisan|pisan\\w* oblik|aneks"] }],
  recommendation: "Odrediti da su izmjene i dopune valjane samo u pisanom obliku (aneks).",
};

export const BUILT_IN_TEMPLATES: ReviewTemplate[] = [
  {
    id: "usluge", builtIn: true, name: "Ugovor o pružanju usluga", description: "Predmet usluga, rokovi, naknada, odgovornost, IP, povjerljivost i raskid.",
    detect: ["usluga|usluge|savjetodavn|izvrsitelj|narucitelj"],
    topics: [
      IDENTITY,
      { id: "predmet", title: "Predmet i opseg usluga", importance: "visoka", question: "Jesu li usluge jasno i nedvosmisleno definirane?",
        criteria: [{ label: "Opis usluga", patterns: ["predmet ugovora|opseg usluga|pruzanje usluga|usluge obuhvacaju|savjetodavn\\w* uslug"] }, { label: "Isporuke i rezultat", patterns: ["isporuk|rezultat|izvjesc"] }, { label: "Što nije uključeno", patterns: ["nije obuhvacen|ne obuhvaca|iskljucen\\w* iz opsega"] }],
        recommendation: "Opisati usluge, očekivane isporuke i izričito navesti što nije obuhvaćeno opsegom." },
      { id: "naknada", title: "Naknada i plaćanje", importance: "visoka", question: "Je li jasno kako se određuje i plaća naknada?",
        criteria: [{ label: "Iznos ili način obračuna", patterns: ["naknad\\w*.{0,40}(eur|kn|iznos)|\\d[\\d.]*,?\\d* ?eur|satnic|pausal"] }, { label: "Rok plaćanja", patterns: ["rok\\w* placanja|u roku od \\d+ dana|placa se|dospijev"] }, { label: "Zatezne kamate", patterns: ["zatezn\\w* kamat"] }],
        recommendation: "Navesti iznos ili način obračuna, rok plaćanja (najviše 60 dana među poduzetnicima) i zatezne kamate.", basis: "ZOO čl. 29. · Direktiva 2011/7/EU" },
      { id: "rokovi", title: "Rokovi izvršenja", importance: "srednja", question: "Jesu li rokovi i faze izvršenja određeni?",
        criteria: [{ label: "Početak i trajanje", patterns: ["stupa na snagu|traje|na odredeno vrijeme|na neodredeno vrijeme|pocetak"] }, { label: "Posljedice kašnjenja", patterns: ["zakasnjen|kasnjenj|ugovorn\\w* kazn|penal"] }],
        recommendation: "Odrediti početak, trajanje i posljedice kašnjenja (npr. ugovornu kaznu)." },
      { id: "odgovornost", title: "Odgovornost i naknada štete", importance: "visoka", question: "Je li odgovornost pružatelja jasno definirana i ograničena?",
        criteria: [{ label: "Ograničenje odgovornosti", patterns: ["ogranicen\\w* odgovornost|odgovornost.{0,40}ogranic|najvise do iznosa|limit odgovornost"] }, { label: "Isključenje neizravne štete", patterns: ["neizravn\\w* stet|izmakl\\w* korist|posljedicn\\w* stet"] }, { label: "Iznimke (namjera, krajnja nepažnja)", patterns: ["namjer|krajnj\\w* nepaznj"] }],
        recommendation: "Ograničiti odgovornost na iznos naknade, isključiti neizravnu štetu uz iznimku namjere i krajnje nepažnje.", basis: "ZOO čl. 345. (ugovorno ograničenje odgovornosti)" },
      { id: "ip", title: "Intelektualno vlasništvo", importance: "srednja", question: "Tko je nositelj prava na rezultatima rada?",
        criteria: [{ label: "Prijenos ili licencija prava", patterns: ["autorsk\\w* prav|intelektualn\\w* vlasnistv|licenc|prenosi prava"] }],
        recommendation: "Urediti prijenos autorskih imovinskih prava ili licenciju na rezultatima usluga." },
      { id: "povjerljivost", title: "Povjerljivost i zaštita podataka", importance: "srednja", question: "Jesu li povjerljive informacije i osobni podaci zaštićeni?",
        criteria: [{ label: "Obveza povjerljivosti", patterns: ["povjerljiv|poslovn\\w* tajn"] }, { label: "Obrada osobnih podataka (GDPR)", patterns: ["osobn\\w* podat|gdpr|opc\\w* uredb\\w* o zastiti podataka|izvrsitelj obrade"] }],
        recommendation: "Ugovoriti povjerljivost i, ako se obrađuju osobni podaci, sporazum o obradi prema čl. 28. GDPR-a.", basis: "GDPR čl. 28." },
      TERMINATION, DISPUTES, AMENDMENTS,
    ],
  },
  {
    id: "zakup", builtIn: true, name: "Ugovor o najmu / zakupu", description: "Predmet, trajanje, najamnina, troškovi, održavanje, otkaz i predaja prostora.",
    detect: ["zakup|najam|najamnin|zakupnin|poslovn\\w* prostor"],
    topics: [
      IDENTITY,
      { id: "predmet", title: "Predmet zakupa", importance: "visoka", question: "Je li prostor točno označen i namjena određena?",
        criteria: [{ label: "Oznaka prostora (adresa, površina, k.č.)", patterns: ["adres|povrsin|m2|m²|katastarsk|k\\.c\\.|zk ulo"] }, { label: "Namjena prostora", patterns: ["namjen|djelatnost"] }],
        recommendation: "Navesti adresu, površinu, zemljišnoknjižne podatke i namjenu prostora.", basis: "ZZKPP čl. 5." },
      { id: "najamnina", title: "Zakupnina i troškovi", importance: "visoka", question: "Je li zakupnina određena i tko snosi troškove?",
        criteria: [{ label: "Iznos zakupnine", patterns: ["zakupnin|najamnin|najamnina iznosi"] }, { label: "Rok plaćanja", patterns: ["do \\d{1,2}\\. u mjesecu|rok\\w* placanja|mjesecno unaprijed|u roku od \\d+ dana"] }, { label: "Režijski troškovi", patterns: ["rezij|troskov\\w* (odrzavanja|koristenja)|pricuv"] }, { label: "Usklađenje zakupnine", patterns: ["uskladen|indeks|revalorizac"] }],
        recommendation: "Odrediti zakupninu, rok plaćanja, raspodjelu režijskih troškova i način usklađenja." },
      { id: "trajanje", title: "Trajanje i produljenje", importance: "srednja", question: "Koliko traje zakup i produljuje li se automatski?",
        criteria: [{ label: "Trajanje", patterns: ["na odredeno vrijeme|na neodredeno vrijeme|u trajanju od|traje"] }, { label: "Produljenje", patterns: ["produlj"] }],
        recommendation: "Odrediti trajanje i izričito urediti (ne)produljenje te rok za obavijest." },
      { id: "odrzavanje", title: "Održavanje i preinake", importance: "srednja", question: "Tko održava prostor i smije li zakupnik vršiti preinake?",
        criteria: [{ label: "Održavanje", patterns: ["odrzavan|popravk"] }, { label: "Preinake uz suglasnost", patterns: ["preinak|adaptac|suglasnost zakupodavca"] }],
        recommendation: "Razgraničiti tekuće i investicijsko održavanje; preinake samo uz pisanu suglasnost." },
      { id: "osiguranje", title: "Osiguranje plaćanja", importance: "srednja", question: "Je li plaćanje osigurano?",
        criteria: [{ label: "Jamčevina ili zadužnica", patterns: ["jamcevin|depozit|zaduznic|bjanko|garancij"] }, { label: "Ovršnost (solemnizacija)", patterns: ["solemniz|ovrsn\\w* isprav|javnobiljeznick"] }],
        recommendation: "Ugovoriti jamčevinu ili zadužnicu; za poslovni prostor ugovor sklopiti kao ovršnu ispravu.", basis: "ZZKPP čl. 4." },
      TERMINATION, DISPUTES, AMENDMENTS,
    ],
  },
  {
    id: "nda", builtIn: true, name: "Ugovor o povjerljivosti (NDA)", description: "Definicija povjerljivih informacija, obveze, iznimke, trajanje i sankcije.",
    detect: ["povjerljiv|nda|poslovn\\w* tajn"],
    topics: [
      IDENTITY,
      { id: "definicija", title: "Definicija povjerljivih informacija", importance: "visoka", question: "Što se smatra povjerljivom informacijom?",
        criteria: [{ label: "Definicija", patterns: ["povjerljiv\\w* informacij\\w* (su|znaci|smatraju)|smatraju se povjerljiv"] }, { label: "Oblik (pisano, usmeno, elektroničko)", patterns: ["usmen|pisan|elektronick"] }],
        recommendation: "Definirati povjerljive informacije neovisno o obliku i načinu priopćenja." },
      { id: "iznimke", title: "Iznimke", importance: "srednja", question: "Koje informacije nisu povjerljive?",
        criteria: [{ label: "Javno dostupne informacije", patterns: ["javno dostupn|opce poznat"] }, { label: "Zakonska obveza otkrivanja", patterns: ["zakonsk\\w* obvez|nalog suda|nadlezn\\w* tijel"] }],
        recommendation: "Navesti uobičajene iznimke (javno dostupno, već poznato, zakonska obveza otkrivanja)." },
      { id: "trajanje", title: "Trajanje obveze", importance: "srednja", question: "Koliko dugo traje obveza povjerljivosti?",
        criteria: [{ label: "Trajanje nakon prestanka", patterns: ["nakon prestanka|godin\\w* od|traje \\d+"] }],
        recommendation: "Odrediti trajanje obveze i nakon prestanka suradnje." },
      { id: "sankcije", title: "Povreda i sankcije", importance: "visoka", question: "Koje su posljedice povrede?",
        criteria: [{ label: "Ugovorna kazna ili naknada štete", patterns: ["ugovorn\\w* kazn|naknad\\w* stet|penal"] }, { label: "Povrat ili uništenje materijala", patterns: ["povrat|unist"] }],
        recommendation: "Ugovoriti ugovornu kaznu za povredu i obvezu povrata ili uništenja materijala.", basis: "ZOO čl. 350.–356." },
      DISPUTES,
    ],
  },
  {
    id: "rad", builtIn: true, name: "Ugovor o radu", description: "Obvezni sadržaj ugovora o radu prema Zakonu o radu.",
    detect: ["ugovor o radu|radnik|poslodavac|radno mjesto"],
    topics: [
      IDENTITY,
      { id: "obvezni", title: "Obvezni sadržaj (ZOR čl. 15.)", importance: "visoka", question: "Sadrži li ugovor podatke koje propisuje Zakon o radu?",
        criteria: [{ label: "Mjesto rada", patterns: ["mjesto rada|mjesto obavljanja"] }, { label: "Naziv i opis poslova", patterns: ["radno mjesto|naziv posla|opis poslova|poslovi radnika"] }, { label: "Dan početka rada", patterns: ["pocinje raditi|dan pocetka|stupanja na rad"] }, { label: "Trajanje (određeno/neodređeno)", patterns: ["na odredeno vrijeme|na neodredeno vrijeme"] }, { label: "Plaća", patterns: ["plac\\w*|bruto|neto"] }, { label: "Radno vrijeme", patterns: ["radno vrijeme|puno radno vrijeme|sati tjedno"] }, { label: "Godišnji odmor", patterns: ["godisnj\\w* odmor"] }, { label: "Otkazni rok", patterns: ["otkazn\\w* rok"] }],
        recommendation: "Dopuniti ugovor svim podacima iz ZOR-a čl. 15. ili uputiti na pravilnik/kolektivni ugovor.", basis: "ZOR čl. 15." },
      { id: "probni", title: "Probni rad", importance: "niska", question: "Je li ugovoren probni rad i koliko traje?",
        criteria: [{ label: "Probni rad", patterns: ["probn\\w* rad"] }],
        recommendation: "Ako se ugovara, probni rad može trajati najviše šest mjeseci.", basis: "ZOR čl. 53." },
      { id: "zabrana", title: "Ugovorna zabrana natjecanja", importance: "niska", question: "Postoji li zabrana natjecanja i je li valjana?",
        criteria: [{ label: "Zabrana natjecanja", patterns: ["zabran\\w* natjecanj"] }],
        recommendation: "Zabrana natjecanja veže najviše dvije godine i zahtijeva naknadu radniku.", basis: "ZOR čl. 101.–104." },
      DISPUTES,
    ],
  },
];

/** Escaped, linear-time pattern from firm keywords: no user-supplied regular expressions are ever executed. */
export function keywordPattern(keywords: string[]): string | null {
  const parts = keywords.map((k) => fold(k).trim().replace(/\s+/g, " ")).filter((k) => k.length >= 2)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, (c) => (c === "*" ? "*" : `\\${c}`)).replace(/\*/g, "[a-z]*").replace(/ /g, "\\s+"));
  return parts.length ? parts.join("|") : null;
}

export function criterionPatterns(c: ReviewCriterion): string[] {
  const fromKeywords = c.keywords?.length ? keywordPattern(c.keywords) : null;
  return fromKeywords ? [fromKeywords] : c.patterns ?? [];
}

function detectPatterns(t: ReviewTemplate): string[] {
  const fromKeywords = t.detectKeywords?.length ? keywordPattern(t.detectKeywords) : null;
  return fromKeywords ? [fromKeywords] : t.detect;
}

/** Built-in patterns that firm templates may keep when they are copied from a built-in. */
export const VETTED_DETECT = new Set(BUILT_IN_TEMPLATES.flatMap((t) => t.detect));
export const VETTED_PATTERNS = new Set(BUILT_IN_TEMPLATES.flatMap((t) => t.topics.flatMap((topic) => topic.criteria.flatMap((c) => c.patterns ?? []))));

export function suggestTemplate(text: string, templates = BUILT_IN_TEMPLATES): ReviewTemplate {
  const t = fold(text);
  const scored = templates.map((tpl) => ({ tpl, score: detectPatterns(tpl).reduce((n, p) => n + (t.match(new RegExp(p, "g"))?.length ?? 0), 0) }));
  return scored.sort((a, b) => b.score - a.score)[0].tpl;
}

function quoteAround(text: string, index: number, length: number): string {
  // Expand to sentence boundaries, at most ~260 characters.
  let start = Math.max(0, text.lastIndexOf(".", index) + 1);
  if (index - start > 160) start = index - 120;
  let end = text.indexOf(".", index + length);
  end = end < 0 ? Math.min(text.length, index + 200) : Math.min(end + 1, index + 220);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

export function evaluateTemplate(template: ReviewTemplate, chunks: Chunk[]): TopicResult[] {
  const folded = chunks.map((c) => ({ chunk: c, text: fold(c.text) }));
  return template.topics.map((topic) => {
    const criteria: CriterionResult[] = topic.criteria.map((criterion) => {
      for (const { chunk, text } of folded) {
        for (const pattern of criterionPatterns(criterion)) {
          const m = new RegExp(pattern).exec(text);
          // Folding keeps string length for Croatian letters, so indices map back onto the original text.
          if (m) return { label: criterion.label, found: true, quote: quoteAround(chunk.text, m.index, m[0].length), chunkId: chunk.id, heading: chunk.heading };
        }
      }
      return { label: criterion.label, found: false };
    });
    const found = criteria.filter((c) => c.found).length;
    return { topic, criteria, status: found === criteria.length ? "obuhvaceno" : found === 0 ? "nedostaje" : "djelomicno" };
  });
}

/* ---------- Firm templates ---------- */

const slug = (s: string) => fold(s).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "tema";
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const words = (v: unknown, maxItems: number, maxLen: number) => (Array.isArray(v) ? v : typeof v === "string" ? v.split(",") : [])
  .filter((x): x is string => typeof x === "string").map((x) => x.trim().slice(0, maxLen)).filter((x) => x.length >= 2).slice(0, maxItems);

/** Validates an editor submission; returns a clean template or an error message (Croatian, user-facing). */
export function sanitizeTemplate(input: unknown, id: string, createdBy: string): ReviewTemplate | string {
  const raw = (input ?? {}) as Record<string, unknown>;
  const name = str(raw.name, 80);
  if (!name) return "Unesite naziv predloška.";
  const topicsIn = Array.isArray(raw.topics) ? raw.topics.slice(0, 30) : [];
  if (!topicsIn.length) return "Dodajte barem jednu temu.";
  const used = new Set<string>();
  const topics: ReviewTopic[] = [];
  for (const [i, t] of topicsIn.entries()) {
    const topic = (t ?? {}) as Record<string, unknown>;
    const title = str(topic.title, 120);
    if (!title) return `Tema ${i + 1}: unesite naslov.`;
    let topicId = slug(str(topic.id, 40) || title);
    while (used.has(topicId)) topicId = `${topicId}-${i + 1}`;
    used.add(topicId);
    const criteriaIn = Array.isArray(topic.criteria) ? topic.criteria.slice(0, 10) : [];
    const criteria: ReviewCriterion[] = [];
    for (const [j, c] of criteriaIn.entries()) {
      const crit = (c ?? {}) as Record<string, unknown>;
      const label = str(crit.label, 120);
      const keywords = words(crit.keywords, 12, 80);
      // Raw patterns are accepted only when they are vetted built-in patterns (copied templates).
      const patterns = Array.isArray(crit.patterns) ? (crit.patterns as unknown[]).filter((p): p is string => typeof p === "string" && VETTED_PATTERNS.has(p)) : [];
      if (!label && !keywords.length && !patterns.length) continue;
      if (!label) return `Tema „${title}”, kriterij ${j + 1}: unesite naziv.`;
      if (!keywords.length && !patterns.length) return `Kriterij „${label}”: unesite barem jednu ključnu riječ.`;
      criteria.push({ label, ...(keywords.length ? { keywords } : { patterns }) });
    }
    if (!criteria.length) return `Tema „${title}”: dodajte barem jedan kriterij.`;
    const importance = topic.importance === "visoka" || topic.importance === "niska" ? topic.importance : "srednja";
    topics.push({ id: topicId, title, question: str(topic.question, 300) || title, importance, criteria, recommendation: str(topic.recommendation, 600) || "Dopuniti ugovor.", basis: str(topic.basis, 200) || undefined });
  }
  const detect = Array.isArray(raw.detect) ? (raw.detect as unknown[]).filter((p): p is string => typeof p === "string" && VETTED_DETECT.has(p)) : [];
  return { id, name, description: str(raw.description, 240), detect, detectKeywords: words(raw.detectKeywords, 12, 60), topics, createdBy, updatedAt: new Date().toISOString() };
}

export function allTemplates(custom: ReviewTemplate[] = []): ReviewTemplate[] {
  return [...custom, ...BUILT_IN_TEMPLATES];
}
