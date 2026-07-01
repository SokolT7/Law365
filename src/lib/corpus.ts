import type { Chunk } from "@/lib/types";
import { sourceName } from "@/lib/sources";

/**
 * Kurirani demo-korpus izvora prava (HR + EU).
 * Sažeci ključnih odredbi pripremljeni za demonstraciju — u produkciji se
 * zamjenjuje živim vezama na NN, EUR-Lex i baze sudske prakse (uz embeddinge).
 */
export interface CorpusEntry {
  sourceId: string; // veže se na katalog u lib/sources.ts
  law: string; // naziv propisa/odluke
  ref: string; // članak / broj predmeta
  text: string;
}

export const CORPUS: CorpusEntry[] = [
  /* ---------- RH zakoni i propisi ---------- */
  {
    sourceId: "rh-zakoni",
    law: "Zakon o obveznim odnosima (NN 35/05 i dr.)",
    ref: "čl. 29.",
    text: "Dužnik koji zakasni s ispunjenjem novčane obveze duguje, pored glavnice, i zatezne kamate. Stopa zateznih kamata određuje se za svako polugodište uvećanjem prosječne kamatne stope na stanja kredita.",
  },
  {
    sourceId: "rh-zakoni",
    law: "Zakon o obveznim odnosima (NN 35/05 i dr.)",
    ref: "čl. 295.",
    text: "Ugovorna kazna mora biti ugovorena u obliku propisanom za ugovor iz kojega je obveza nastala. Vjerovnik ne može zahtijevati ugovornu kaznu za zakašnjenje ako je primio ispunjenje obveze, a nije bez odgađanja priopćio dužniku da zadržava pravo na ugovornu kaznu.",
  },
  {
    sourceId: "rh-zakoni",
    law: "Zakon o financijskom poslovanju i predstečajnoj nagodbi (NN 108/12 i dr.)",
    ref: "čl. 11.",
    text: "U poslovnim transakcijama među poduzetnicima može se ugovoriti rok ispunjenja novčane obveze do 60 dana. Iznimno se može ugovoriti i dulji rok, ali ne dulji od 360 dana, ako je dužnik izdao sredstvo osiguranja plaćanja koje ima učinak ovršne isprave. Rok plaćanja dulji od 60 dana bez takvog osiguranja protivan je zakonu.",
  },
  {
    sourceId: "rh-zakoni",
    law: "Zakon o radu (NN 93/14, 151/22)",
    ref: "čl. 17.a",
    text: "Rad na izdvojenom mjestu rada (rad na daljinu) ugovara se ugovorom o radu. Poslodavac je dužan radniku naknaditi troškove nastale zbog obavljanja posla na daljinu ako je rad na daljinu ugovoren kao stalan.",
  },
  {
    sourceId: "rh-zakoni",
    law: "Zakon o zakupu i kupoprodaji poslovnoga prostora (NN 125/11 i dr.)",
    ref: "čl. 4.",
    text: "Ugovor o zakupu poslovnoga prostora sklapa se u pisanom obliku. Ugovor koji nije sklopljen u pisanom obliku ne proizvodi pravne učinke.",
  },
  {
    sourceId: "rh-zakoni",
    law: "Zakon o zaštiti potrošača (NN 19/22)",
    ref: "čl. 49.",
    text: "Nepoštene ugovorne odredbe u potrošačkim ugovorima ništetne su. Ugovorna odredba o kojoj se nije pojedinačno pregovaralo smatra se nepoštenom ako suprotno načelu savjesnosti i poštenja uzrokuje znatnu neravnotežu u pravima i obvezama na štetu potrošača.",
  },

  /* ---------- RH sudska praksa (demo-sažeci) ---------- */
  {
    sourceId: "rh-praksa",
    law: "Sudska praksa — Vrhovni sud RH (demo-sažetak)",
    ref: "automatsko produljenje ugovora",
    text: "Prema ustaljenoj praksi, klauzula o automatskom (prešutnom) produljenju ugovora valjana je ako je jasno ugovorena, uključujući rok i način otkaza kojim se produljenje sprječava. Propuštanje ugovorenog roka za otkaz u pravilu veže stranku za novo razdoblje.",
  },
  {
    sourceId: "rh-praksa",
    law: "Sudska praksa — Visoki trgovački sud RH (demo-sažetak)",
    ref: "ograničenje odgovornosti",
    text: "Odredbe o ograničenju odgovornosti tumače se usko. Odgovornost za štetu prouzročenu namjerno ili krajnjom nepažnjom ne može se unaprijed ugovorom isključiti ni ograničiti (usp. ZOO čl. 345.).",
  },

  /* ---------- EU propisi ---------- */
  {
    sourceId: "eu-propisi",
    law: "Uredba (EU) 2016/679 (GDPR)",
    ref: "čl. 28.",
    text: "Obrada koju provodi izvršitelj obrade uređuje se ugovorom koji obvezuje izvršitelja prema voditelju obrade i u kojem se navode predmet i trajanje obrade, priroda i svrha obrade, vrsta osobnih podataka, kategorije ispitanika te obveze i prava voditelja obrade. Ugovor s pružateljem usluga koji obrađuje osobne podatke (npr. IT/SaaS) obvezan je.",
  },
  {
    sourceId: "eu-propisi",
    law: "Uredba (EU) 2016/679 (GDPR)",
    ref: "čl. 32.",
    text: "Voditelj i izvršitelj obrade provode odgovarajuće tehničke i organizacijske mjere kako bi osigurali razinu sigurnosti primjerenu riziku, uključujući pseudonimizaciju i enkripciju osobnih podataka te sposobnost pravodobne ponovne uspostave dostupnosti podataka u slučaju incidenta.",
  },
  {
    sourceId: "eu-propisi",
    law: "Direktiva 2011/7/EU o borbi protiv kašnjenja u plaćanju",
    ref: "čl. 3.",
    text: "U poslovnim transakcijama među poduzetnicima razdoblje plaćanja utvrđeno ugovorom ne smije prelaziti 60 kalendarskih dana, osim ako je u ugovoru izričito drukčije dogovoreno i pod uvjetom da to nije izrazito nepošteno prema vjerovniku.",
  },

  /* ---------- Sud EU ---------- */
  {
    sourceId: "eu-sud",
    law: "Sud EU — C-311/18 (Schrems II)",
    ref: "presuda od 16. srpnja 2020.",
    text: "Prijenos osobnih podataka u treće zemlje na temelju standardnih ugovornih klauzula dopušten je samo ako je u praksi osigurana razina zaštite u bitnome istovjetna onoj u EU; nadzorna tijela dužna su obustaviti prijenos kad ta razina nije osigurana.",
  },

  /* ---------- AZOP ---------- */
  {
    sourceId: "azop",
    law: "AZOP — smjernice (demo-sažetak)",
    ref: "nadzor radnika",
    text: "Video nadzor radnih prostorija dopušten je samo ako je nužan i zakonit, uz prethodnu obavijest radnicima. Praćenje službene e-pošte mora biti razmjerno, transparentno i uređeno internim aktom poslodavca.",
  },
];

/** Korpus preveden u Chunk oblik radi zajedničkog pretraživanja (searchChunks). */
export function corpusChunks(enabled: Record<string, boolean>): Chunk[] {
  return CORPUS.filter((e) => enabled[e.sourceId]).map((e, i) => ({
    id: `corpus-${i}`,
    documentId: `corpus:${e.sourceId}`,
    index: i,
    heading: `${e.law} — ${e.ref}`,
    text: e.text,
  }));
}

/** Naziv „dokumenta” za korpusni ulomak (naziv izvora iz kataloga). */
export function corpusTitle(documentId: string): string | null {
  if (!documentId.startsWith("corpus:")) return null;
  return sourceName(documentId.slice("corpus:".length));
}
