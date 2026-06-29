export type SourceStatus = "connected" | "available";

export interface SourceItem {
  id: string;
  name: string;
  desc: string;
  status: SourceStatus;
}
export interface SourceGroup {
  id: string;
  title: string;
  items: SourceItem[];
}

/** Katalog izvora prava na koje se AI može osloniti pri odgovaranju. */
export const SOURCE_GROUPS: SourceGroup[] = [
  {
    id: "rh",
    title: "Hrvatski propisi i praksa",
    items: [
      { id: "rh-zakoni", name: "Zakoni i propisi (Narodne novine)", desc: "Pročišćeni tekstovi zakona, uredbi i pravilnika.", status: "available" },
      { id: "rh-praksa", name: "Sudska praksa RH", desc: "Odluke hrvatskih sudova.", status: "available" },
    ],
  },
  {
    id: "eu",
    title: "Pravo Europske unije",
    items: [
      { id: "eu-propisi", name: "EU propisi (EUR-Lex)", desc: "Uredbe, direktive i odluke EU-a.", status: "available" },
      { id: "eu-sud", name: "Sud Europske unije (CJEU)", desc: "Presude Suda EU-a.", status: "available" },
      { id: "echr", name: "Europski sud za ljudska prava", desc: "Praksa ESLJP-a.", status: "available" },
    ],
  },
  {
    id: "reg",
    title: "Regulatorna tijela",
    items: [
      { id: "azop", name: "AZOP", desc: "Zaštita osobnih podataka (GDPR).", status: "available" },
      { id: "hanfa", name: "HANFA", desc: "Financijske usluge i tržišta.", status: "available" },
      { id: "hakom", name: "HAKOM", desc: "Elektroničke komunikacije.", status: "available" },
      { id: "aztn", name: "AZTN", desc: "Tržišno natjecanje.", status: "available" },
      { id: "dkom", name: "DKOM", desc: "Javna nabava.", status: "available" },
    ],
  },
  {
    id: "vlastiti",
    title: "Vaši izvori",
    items: [
      { id: "vasi-dokumenti", name: "Vaši dokumenti", desc: "Predmetni dokumenti i ugovori vašeg ureda.", status: "connected" },
      { id: "interni-akti", name: "Interni akti i baza znanja", desc: "Vlastiti pravilnici, predlošci i memorandumi.", status: "connected" },
    ],
  },
  {
    id: "ostalo",
    title: "Ostalo",
    items: [
      { id: "web", name: "Web pretraživanje", desc: "Provjereni javni izvori s interneta.", status: "available" },
    ],
  },
];

const DEFAULT_ON = new Set(["rh-zakoni", "rh-praksa", "eu-propisi", "vasi-dokumenti"]);

export function defaultSources(): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const g of SOURCE_GROUPS) for (const it of g.items) out[it.id] = DEFAULT_ON.has(it.id);
  return out;
}

export function allSourceItems(): SourceItem[] {
  return SOURCE_GROUPS.flatMap((g) => g.items);
}

export function sourceName(id: string): string {
  return allSourceItems().find((s) => s.id === id)?.name ?? id;
}
