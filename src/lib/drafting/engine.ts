import type { Mode } from "@/lib/types";
import { legalStatus, searchLegal, toSourceRecord } from "@/lib/legal/store";
import { getClient, getModel } from "@/lib/ai/client";
import type { DraftKind, DraftKindId } from "@/lib/drafting/kinds";

/** A statute provision the draft was grounded in (shown behind "Pravna osnova"). */
export interface DraftSource { label: string; title: string; heading?: string; url?: string }

export type DraftEvent =
  | { type: "sources"; sources: DraftSource[] }
  | { type: "delta"; text: string }
  | { type: "complete"; text: string }
  | { type: "error"; message: string };

export interface DraftInput {
  kind: DraftKind;
  brief: string;
  clientName?: string;
  /** Revision: the current draft and what to change in it. */
  current?: string;
  instruction?: string;
  /** Enabled catalogue sources from firm settings (server-authoritative). */
  sources: Record<string, boolean>;
  mode: Mode;
  signal?: AbortSignal;
}

/** Acts and search terms that pull the provisions a lawyer would check for each document. */
const GROUNDING: Record<DraftKindId, { acts: string[]; query: string }> = {
  "ugovor-o-djelu": { acts: ["ZOO"], query: "ugovor o djelu izvođač naručitelj naknada rok izvršenja nedostaci djela" },
  "ugovor-o-radu": { acts: ["ZOR"], query: "ugovor o radu sadržaj plaća radno vrijeme probni rad godišnji odmor otkazni rok" },
  nda: { acts: ["ZOO"], query: "poslovna tajna povjerljivost ugovorna kazna naknada štete" },
  zakup: { acts: ["ZZKPP", "ZOO"], query: "ugovor o zakupu poslovnoga prostora pisani oblik zakupnina otkazni rok predaja prostora" },
  kupoprodaja: { acts: ["ZOO"], query: "ugovor o kupoprodaji cijena predaja stvari odgovornost za materijalne nedostatke" },
  punomoc: { acts: ["ZOO", "ZPP"], query: "punomoć opseg ovlasti punomoćnik opoziv punomoći" },
  opomena: { acts: ["ZOO"], query: "zakašnjenje dužnika opomena zatezne kamate ispunjenje novčane obveze" },
  drugo: { acts: [], query: "" },
};

const SYSTEM = [
  "Ti si LTB Law, asistent koji odvjetnicima sastavlja nacrte pravnih dokumenata prema hrvatskom pravu.",
  "PRAVILA:",
  "1. Sastavi cjelovit nacrt na hrvatskom jeziku, u obliku uobičajenom u hrvatskoj odvjetničkoj praksi.",
  "2. Koristi samo podatke iz upute. Podatke koji nedostaju (imena, OIB, adrese, iznose, datume) ne izmišljaj, nego ih označi u uglatim zagradama, npr. [OIB naručitelja].",
  "3. Zakonske odredbe navodi samo ako su u priloženom popisu odredbi; ne izmišljaj brojeve članaka.",
  "4. Ugovore piši po člancima: „Članak 1.” u zasebnom retku, zatim tekst. Završi mjestom, datumom i potpisima.",
  "5. Piši čisti tekst bez Markdowna (bez zvjezdica, ljestvi i tablica). Prvi redak je naslov dokumenta velikim slovima.",
  "6. Ne dodaji uvod, objašnjenja ni napomene prije ili poslije dokumenta.",
].join("\n");

const REVISION = "Korisnik traži izmjenu postojećeg nacrta. Vrati CIJELI izmijenjeni dokument, a sve što izmjena ne dira zadrži doslovno.";

type Provision = DraftSource & { excerpt: string };

function grounding(input: DraftInput): Provision[] {
  const { acts, query } = GROUNDING[input.kind.id];
  const available = legalStatus().some((s) => s.sourceId === "rh-zakoni");
  if (!available || !input.sources["rh-zakoni"]) return [];
  // The topic finds the core provisions; the brief alone adds anything specific (names and amounts would dilute the topic).
  const seen = new Set<string>();
  const hits = [...(query ? searchLegal(query, ["statute"], 4, acts, ["rh-zakoni"]) : []), ...searchLegal(input.brief, ["statute"], 2, acts, ["rh-zakoni"])]
    .filter((hit) => !seen.has(hit.row.id) && seen.add(hit.row.id));
  return hits.map((hit) => toSourceRecord(hit, 0, query || input.brief)).map((r) => ({
    label: r.label, title: r.title, heading: r.heading && r.heading.length <= 120 ? r.heading : undefined, url: r.url, excerpt: r.excerpt.length > 1400 ? `${r.excerpt.slice(0, 1400)}…` : r.excerpt,
  }));
}

function userPrompt(input: DraftInput, provisions: Provision[]): string {
  const parts = [`Vrsta dokumenta: ${input.kind.label}`];
  if (input.clientName) parts.push(`Klijent našeg ureda: ${input.clientName}`);
  parts.push(`Uputa odvjetnika:\n${input.brief}`);
  if (provisions.length) parts.push(`Relevantne zakonske odredbe:\n${provisions.map((p) => `[${p.label}] ${p.title}${p.heading ? ` — ${p.heading}` : ""}\n${p.excerpt}`).join("\n\n")}`);
  if (input.current) parts.push(`Postojeći nacrt:\n<<<\n${input.current}\n>>>\n\nTražena izmjena: ${input.instruction}`);
  return parts.join("\n\n");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Drafts (or revises) one document and yields protocol events. The caller decides whether to save it. */
export async function* runDraft(input: DraftInput): AsyncGenerator<DraftEvent> {
  const { signal } = input;
  const provisions = grounding(input);
  yield { type: "sources", sources: provisions.map(({ label, title, heading, url }) => ({ label, title, heading, url })) };

  let text = "";
  if (input.mode === "live") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client: any = await getClient();
    const stream = client.messages.stream({
      model: getModel(), max_tokens: 8000,
      system: input.current ? `${SYSTEM}\n${REVISION}` : SYSTEM,
      messages: [{ role: "user", content: userPrompt(input, provisions) }],
    });
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
    if (input.current) { yield { type: "error", message: "Dorada uputom dostupna je kad je uključen AI." }; return; }
    const full = demoDraft(input);
    // Stream in small word groups so the interface behaves the same as in live mode.
    const pieces = full.match(/\S+\s*/g) ?? [full];
    for (let i = 0; i < pieces.length; i += 6) {
      if (signal?.aborted) break;
      const piece = pieces.slice(i, i + 6).join("");
      text += piece;
      yield { type: "delta", text: piece };
      await sleep(12);
    }
  }
  yield { type: "complete", text: text.trim() };
}

/* ---------- Demo drafts (no AI key): a fixed skeleton with the lawyer's brief as the subject ---------- */

const SIGNATURES = (a: string, b: string) => `U [mjesto], dana [datum].\n\n${a}:\t\t\t\t${b}:\n\n______________________\t\t______________________`;
const PARTY = (role: string) => `[naziv / ime i prezime], [adresa], OIB: [OIB], koje zastupa [zastupnik] (dalje: ${role})`;

function demoDraft({ kind, brief, clientName }: DraftInput): string {
  const subject = brief.trim().replace(/\s+/g, " ");
  const client = clientName ? ` (klijent: ${clientName})` : "";
  const contract = (title: string, a: string, b: string, articles: string[]) => [
    title.toUpperCase(),
    `sklopljen između:\n\n1. ${PARTY(a)}\n\ni\n\n2. ${PARTY(b)}`,
    ...articles.map((text, i) => `Članak ${i + 1}.\n\n${text}`),
    SIGNATURES(a.charAt(0).toUpperCase() + a.slice(1), b.charAt(0).toUpperCase() + b.slice(1)),
  ].join("\n\n");
  const closing = [
    "Na sva pitanja koja nisu uređena ovim Ugovorom primjenjuju se odredbe Zakona o obveznim odnosima.",
    "Sve sporove iz ovog Ugovora strane će nastojati riješiti sporazumno, a ako to ne uspije, nadležan je stvarno nadležni sud u [mjesto].",
    "Ovaj Ugovor sastavljen je u 2 (dva) istovjetna primjerka, od kojih svaka strana zadržava po 1 (jedan).",
  ];
  switch (kind.id) {
    case "ugovor-o-djelu": return contract("Ugovor o djelu", "naručitelj", "izvođač", [
      `Predmet ovog Ugovora je izrada djela kako slijedi: ${subject}${client}.`,
      "Izvođač se obvezuje djelo izraditi stručno, prema pravilima struke i uputama Naručitelja, do [rok izvršenja].",
      "Naručitelj se obvezuje Izvođaču za izrađeno djelo platiti naknadu u iznosu od [iznos] EUR, u roku od [broj] dana od primopredaje djela, na račun Izvođača IBAN [IBAN].",
      "Naručitelj će djelo pregledati pri primopredaji i o vidljivim nedostacima bez odgađanja obavijestiti Izvođača. Izvođač odgovara za nedostatke djela u skladu sa zakonom.",
      ...closing,
    ]);
    case "ugovor-o-radu": return contract("Ugovor o radu", "poslodavac", "radnik", [
      `Poslodavac zapošljava Radnika pod sljedećim uvjetima: ${subject}${client}.`,
      "Radnik će rad obavljati na radnom mjestu [naziv radnog mjesta], u mjestu rada [mjesto rada], s danom početka rada [datum].",
      "Ugovor se sklapa na [neodređeno / određeno vrijeme do datuma]. Ugovara se probni rad u trajanju od [trajanje].",
      "Radnik radi u punom radnom vremenu od 40 sati tjedno. Radnik ima pravo na godišnji odmor u trajanju od najmanje četiri tjedna za svaku kalendarsku godinu.",
      "Ugovorena bruto plaća Radnika iznosi [iznos] EUR mjesečno, a isplaćuje se najkasnije do [dan] u mjesecu za prethodni mjesec.",
      "Otkazni rok utvrđuje se u skladu sa Zakonom o radu. Na sva pitanja koja nisu uređena ovim Ugovorom primjenjuju se Zakon o radu i pravilnik o radu Poslodavca.",
      "Ovaj Ugovor sastavljen je u 2 (dva) istovjetna primjerka, od kojih svaka strana zadržava po 1 (jedan).",
    ]);
    case "nda": return contract("Ugovor o povjerljivosti", "prva strana", "druga strana", [
      `Svrha ovog Ugovora je zaštita povjerljivih informacija koje strane razmjenjuju u vezi sa sljedećim: ${subject}${client}.`,
      "Povjerljivim informacijama smatraju se sve poslovne, tehničke, financijske i druge informacije koje jedna strana priopći drugoj, u bilo kojem obliku, osim informacija koje su javno dostupne.",
      "Strana koja primi povjerljive informacije obvezuje se čuvati ih kao poslovnu tajnu, koristiti ih samo u svrhu iz članka 1. i ne otkrivati ih trećima bez prethodne pisane suglasnosti druge strane.",
      "Obveza čuvanja povjerljivosti traje [trajanje] od dana sklapanja ovog Ugovora.",
      "Za svaku povredu obveza iz ovog Ugovora strana koja ih je povrijedila plaća drugoj strani ugovornu kaznu u iznosu od [iznos] EUR, ne dirajući u pravo na naknadu veće štete.",
      ...closing,
    ]);
    case "zakup": return contract("Ugovor o zakupu poslovnoga prostora", "zakupodavac", "zakupnik", [
      `Zakupodavac daje, a Zakupnik prima u zakup poslovni prostor kako slijedi: ${subject}${client}. Prostor se nalazi na adresi [adresa], upisan u zemljišnim knjigama [k.č. / z.k. ul.], površine [površina] m².`,
      "Ugovor se sklapa na određeno vrijeme od [trajanje], počevši od [datum predaje prostora].",
      "Zakupnik plaća mjesečnu zakupninu u iznosu od [iznos] EUR, do [dan] u mjesecu za tekući mjesec. Zakupnik pri sklapanju Ugovora polaže jamčevinu u iznosu od [iznos] EUR.",
      "Zakupnik je dužan prostor koristiti s pažnjom dobrog gospodarstvenika, za djelatnost [djelatnost], i ne smije ga dati u podzakup bez pisane suglasnosti Zakupodavca.",
      "Svaka strana može otkazati Ugovor u slučajevima i rokovima propisanima Zakonom o zakupu i kupoprodaji poslovnoga prostora. Ugovor se potvrđuje (solemnizira) kod javnog bilježnika.",
      ...closing,
    ]);
    case "kupoprodaja": return contract("Kupoprodajni ugovor", "prodavatelj", "kupac", [
      `Prodavatelj prodaje, a Kupac kupuje sljedeću stvar: ${subject}${client}.`,
      "Kupoprodajna cijena iznosi [iznos] EUR i Kupac je plaća [način i rok plaćanja].",
      "Prodavatelj predaje stvar Kupcu [datum i mjesto predaje], zajedno sa svim pripadajućim ispravama.",
      "Prodavatelj jamči da je stvar njegovo vlasništvo, da na njoj ne postoje prava trećih osoba i odgovara za materijalne nedostatke stvari u skladu sa zakonom.",
      ...closing,
    ]);
    case "punomoc": return [
      "PUNOMOĆ",
      `Ja, ${PARTY("vlastodavac")},\n\novlašćujem\n\n[ime i prezime odvjetnika], odvjetnika iz [mjesto], [adresa] (dalje: punomoćnik),`,
      `da me zastupa u sljedećoj stvari: ${subject}${client}.`,
      "Punomoćnik je ovlašten poduzimati sve radnje u postupku, uključujući podnošenje i povlačenje podnesaka i pravnih lijekova, sklapanje nagodbe te primanje pismena, kao i ovlast za daljnje opunomoćenje.",
      "Punomoć vrijedi do opoziva.",
      "U [mjesto], dana [datum].\n\nVlastodavac:\n\n______________________",
    ].join("\n\n");
    case "opomena": return [
      "OPOMENA PRED TUŽBU",
      `Pošiljatelj: ${PARTY("vjerovnik")}\n\nPrimatelj: ${PARTY("dužnik")}`,
      `Poštovani,\n\nu ime i za račun našeg klijenta${clientName ? ` ${clientName}` : ""} obraćamo Vam se u vezi sa sljedećim dugovanjem: ${subject}.`,
      "Do danas niste podmirili dospjelu obvezu u iznosu od [iznos] EUR, čime ste došli u zakašnjenje te od dana dospijeća dugujete i zakonske zatezne kamate.",
      "Pozivamo Vas da navedeni iznos, uvećan za zatezne kamate, uplatite na račun IBAN [IBAN] u roku od [broj] dana od primitka ove opomene.",
      "Ako u ostavljenom roku ne podmirite dug, pokrenut ćemo sudski postupak radi naplate bez daljnje obavijesti, a trošak postupka snosit ćete Vi.",
      "U [mjesto], dana [datum].\n\n[potpis i pečat]",
    ].join("\n\n");
    default: return [
      `${kind.label.toUpperCase()}`,
      `Sastavljeno prema uputi: ${subject}${client}.`,
      "[Tekst dokumenta]",
      "U [mjesto], dana [datum].\n\n______________________",
    ].join("\n\n");
  }
}
