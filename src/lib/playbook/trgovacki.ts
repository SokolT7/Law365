import type { Severity } from "@/lib/types";

/**
 * Standardna pravila pregleda za trgovačke ugovore ("playbook" odvjetničkog društva).
 * Svako pravilo opisuje standardnu poziciju društva i kako se otkriva odstupanje.
 *
 * kind = "absent"  -> nalaz se stvara ako NIJEDNA od ključnih riječi nije pronađena
 *                     (npr. nedostaje odredba o ograničenju odgovornosti)
 * kind = "present" -> nalaz se stvara ako je ključna riječ pronađena
 *                     (npr. postoji problematična odredba o automatskom produljenju)
 */
export interface PlaybookRule {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  kind: "present" | "absent";
  keywords: string[];
}

export const PLAYBOOK: PlaybookRule[] = [
  {
    id: "ogranicenje-odgovornosti",
    title: "Nedostaje ograničenje odgovornosti",
    detail:
      "Ugovor ne sadrži odredbu o ograničenju odgovornosti. Prema Zakonu o obveznim odnosima odgovornost je u pravilu neograničena — preporuča se ugovoriti gornju granicu (npr. vrijednost ugovora).",
    severity: "visoka",
    kind: "absent",
    keywords: ["ograničenje odgovornosti", "ograničava odgovornost", "odgovornost je ograničena", "najviše do iznosa"],
  },
  {
    id: "gdpr",
    title: "Nedostaje odredba o zaštiti osobnih podataka (GDPR)",
    detail:
      "Nema odredbe o obradi osobnih podataka. Ako se podaci razmjenjuju, potrebno je uskladiti ugovor s Uredbom (EU) 2016/679 (GDPR) i ugovoriti izvršitelja obrade.",
    severity: "visoka",
    kind: "absent",
    keywords: ["osobnih podataka", "osobni podaci", "gdpr", "2016/679", "zaštita podataka", "izvršitelj obrade"],
  },
  {
    id: "automatsko-produljenje",
    title: "Automatsko produljenje ugovora",
    detail:
      "Ugovor se automatski (prešutno) produljuje. Provjeriti otkazni rok i osigurati pravovremenu obavijest kako bi se izbjeglo neželjeno obvezivanje.",
    severity: "srednja",
    kind: "present",
    keywords: ["automatski produljuje", "automatsko produljenje", "prešutno produljuje", "prešutno produljenje"],
  },
  {
    id: "mjerodavno-pravo",
    title: "Mjerodavno pravo nije izrijekom ugovoreno",
    detail:
      "Ugovor ne određuje mjerodavno pravo. Preporuča se izrijekom ugovoriti primjenu prava Republike Hrvatske radi pravne sigurnosti.",
    severity: "srednja",
    kind: "absent",
    keywords: ["mjerodavno pravo", "mjerodavno je pravo", "primjenjuje se pravo", "primjenjuju se propisi"],
  },
  {
    id: "strano-pravo",
    title: "Ugovoreno strano mjerodavno pravo",
    detail:
      "Ugovorom je predviđena primjena stranog prava. Za hrvatskog klijenta provjeriti je li to u njegovu interesu te razmotriti primjenu prava Republike Hrvatske.",
    severity: "srednja",
    kind: "present",
    keywords: ["pravo savezne države", "englesko pravo", "pravo irske", "pravo delaware", "njemačko pravo"],
  },
  {
    id: "rok-placanja",
    title: "Predug rok plaćanja (rizik likvidnosti)",
    detail:
      "Ugovoren je rok plaćanja od 90 dana. Prema Zakonu o financijskom poslovanju i predstečajnoj nagodbi rok u poslovnim transakcijama u pravilu ne bi smio prelaziti 60 dana.",
    severity: "srednja",
    kind: "present",
    keywords: ["90 dana", "devedeset dana", "u roku od 90"],
  },
  {
    id: "ugovorna-kazna",
    title: "Ugovorna kazna",
    detail:
      "Ugovor sadrži ugovornu kaznu. Provjeriti razmjernost iznosa; sud može sniziti nerazmjerno visoku ugovornu kaznu (čl. 354. ZOO-a).",
    severity: "niska",
    kind: "present",
    keywords: ["ugovorna kazna", "ugovornu kaznu", "penal"],
  },
  {
    id: "visa-sila",
    title: "Nedostaje odredba o višoj sili",
    detail:
      "Ugovor ne uređuje višu silu (vis maior). Preporuča se odrediti posljedice nemogućnosti ispunjenja zbog izvanrednih okolnosti.",
    severity: "niska",
    kind: "absent",
    keywords: ["viša sila", "više sile", "višu silu", "vis maior"],
  },
  {
    id: "nadleznost-suda",
    title: "Nije ugovorena nadležnost suda ni arbitraža",
    detail:
      "Ugovor ne određuje nadležni sud ni arbitražu za rješavanje sporova. Preporuča se ugovoriti stvarno i mjesno nadležan sud.",
    severity: "niska",
    kind: "absent",
    keywords: ["nadležan je sud", "nadležnost suda", "nadležni sud", "arbitraž", "trgovački sud"],
  },
  {
    id: "kratak-otkazni-rok",
    title: "Kratak otkazni rok",
    detail:
      "Ugovoren je kratak otkazni rok (8 dana). Razmotriti produljenje radi operativne i pravne sigurnosti klijenta.",
    severity: "srednja",
    kind: "present",
    keywords: ["otkazni rok od 8 dana", "otkaznim rokom od 8 dana", "u roku od 8 dana otkazati"],
  },
];
