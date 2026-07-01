import type { DB, DocumentRec, RegSeverity } from "@/lib/types";
import { documentText } from "@/lib/docs";

/**
 * Provjera ugovora prema standardima ureda — deterministički pregled rizika.
 * Radi izravno nad tekstom dokumenta (bez AI poziva), pa je trenutačan i
 * jednak u demo i live načinu. Svaki nalaz navodi odredbu i pravni temelj.
 */
export interface ReviewFinding {
  severity: RegSeverity | "ok";
  title: string;
  detail: string;
  citat?: string; // doslovni navod iz dokumenta
  temelj?: string; // pravni temelj / standard ureda
  preporuka?: string;
}

function grab(text: string, re: RegExp, span = 160): string | undefined {
  const m = re.exec(text);
  if (!m) return undefined;
  const start = Math.max(0, m.index - 20);
  return text.slice(start, m.index + Math.min(m[0].length + span - 20, span)).replace(/\s+/g, " ").trim();
}

export function reviewDocument(db: DB, doc: DocumentRec): ReviewFinding[] {
  const text = documentText(db, doc.id);
  const findings: ReviewFinding[] = [];

  // 1) Rok plaćanja dulji od 60 dana
  const payment = /rok(?:u|a)? od (\d{2,3}) dana od (?:dana )?primitka računa/i.exec(text);
  if (payment) {
    const days = parseInt(payment[1], 10);
    if (days > 60) {
      findings.push({
        severity: "visoka",
        title: `Rok plaćanja od ${days} dana premašuje zakonski okvir`,
        detail:
          `Ugovoren je rok plaćanja od ${days} dana. Među poduzetnicima rok dulji od 60 dana dopušten je samo uz sredstvo osiguranja s učinkom ovršne isprave; EU dodatno predlaže strogi rok od 30 dana.`,
        citat: grab(text, /rok(?:u|a)? od \d{2,3} dana od (?:dana )?primitka računa/i),
        temelj: "Zakon o financijskom poslovanju i predstečajnoj nagodbi, čl. 11. · Direktiva 2011/7/EU, čl. 3.",
        preporuka: "Pregovarati skraćenje na najviše 60 dana ili ugovoriti instrument osiguranja plaćanja.",
      });
    } else {
      findings.push({
        severity: "ok",
        title: `Rok plaćanja (${days} dana) unutar zakonskog okvira`,
        detail: "Ugovoreni rok plaćanja ne premašuje 60 dana.",
      });
    }
  }

  // 2) Automatsko (prešutno) produljenje
  if (/automatski (?:se )?produljuje|prešutno produljenje/i.test(text)) {
    const notice = /najkasnije (\d{1,3}) dana prije isteka/i.exec(text);
    findings.push({
      severity: "srednja",
      title: "Klauzula o automatskom produljenju",
      detail: notice
        ? `Ugovor se automatski produljuje ako otkaz nije dostavljen najkasnije ${notice[1]} dana prije isteka. Propuštanje roka veže klijenta za novo razdoblje.`
        : "Ugovor sadrži automatsko produljenje. Provjeriti rok i način otkaza kojim se produljenje sprječava.",
      citat: grab(text, /automatski (?:se )?produljuje[^.]*\./i),
      temelj: "Sudska praksa: klauzula je valjana ako je jasno ugovorena — rok za otkaz treba kalendarski pratiti.",
      preporuka: "Unijeti rok u kalendar rokova ureda i klijenta upozoriti 60 dana prije isteka.",
    });
  }

  // 3) Ograničenje odgovornosti
  if (!/ograničenj\w* odgovornosti|odgovornost .{0,40}ograničava/i.test(text)) {
    findings.push({
      severity: "srednja",
      title: "Nema odredbe o ograničenju odgovornosti",
      detail:
        "Ugovor ne sadrži klauzulu o ograničenju odgovornosti. Bez nje se odgovornost strana prosuđuje prema općim pravilima, što može značiti neograničenu izloženost klijenta.",
      temelj: "Standard ureda: ugovoriti razuman limit (npr. vrijednost godišnje naknade), uz iznimke za namjeru i krajnju nepažnju (ZOO čl. 345.).",
      preporuka: "Predložiti aneks s klauzulom o ograničenju odgovornosti.",
    });
  }

  // 4) GDPR / obrada osobnih podataka
  const touchesData = /osobn\w+ podat|podatak|informacijsk|sustav|softver|SaaS|usluga/i.test(text);
  if (touchesData && !/osobn\w+ podat|GDPR|2016\/679|voditelj obrade|izvršitelj obrade/i.test(text)) {
    findings.push({
      severity: "visoka",
      title: "Nedostaje odredba o obradi osobnih podataka (GDPR)",
      detail:
        "Priroda usluga upućuje na moguću obradu osobnih podataka, a ugovor ne sadrži odredbe o obradi. GDPR zahtijeva ugovor između voditelja i izvršitelja obrade.",
      temelj: "Uredba (EU) 2016/679 (GDPR), čl. 28.",
      preporuka: "Sklopiti dodatak o obradi podataka (DPA) s definiranim mjerama sigurnosti (čl. 32.).",
    });
  }

  // 5) Jednostrani raskid bez otkaznog roka
  if (/raskinuti .{0,60}bez otkaznog roka|raskid .{0,40}s trenutnim učinkom/i.test(text)) {
    findings.push({
      severity: "visoka",
      title: "Jednostrani raskid bez otkaznog roka",
      detail: "Ugovor dopušta raskid bez otkaznog roka, što klijenta izlaže naglom prekidu suradnje.",
      citat: grab(text, /raskinuti[^.]*bez otkaznog roka[^.]*\./i),
      temelj: "Standard ureda: minimalni otkazni rok 30 dana, uz taksativno navedene razloge za izvanredni raskid.",
      preporuka: "Ugovoriti otkazni rok i ograničiti izvanredni raskid na bitne povrede.",
    });
  }

  // 6) Ugovorna kazna
  if (/ugovorna kazna|penal/i.test(text)) {
    findings.push({
      severity: "niska",
      title: "Ugovorena je ugovorna kazna",
      detail: "Provjeriti visinu i oblik ugovorne kazne te postupak očuvanja prava na kaznu pri primitku ispunjenja.",
      citat: grab(text, /ugovorna kazna[^.]*\./i),
      temelj: "ZOO čl. 295. — pravo na kaznu za zakašnjenje čuva se priopćenjem bez odgađanja.",
    });
  }

  // 7) Nadležnost
  const forum = /nadležan (?:je )?(?:stvarno )?([\w\s]*sud u [A-ZŠĐČĆŽ][a-zšđčćž]+)/i.exec(text);
  if (forum) {
    findings.push({
      severity: "ok",
      title: "Ugovorena nadležnost",
      detail: `Za sporove je ugovoren: ${forum[1].trim()}.`,
      citat: grab(text, /nadležan (?:je )?[^.]*sud u [^.]*\./i),
    });
  }

  // 8) Mjerodavno pravo
  if (!/mjerodavno pravo|primjenjuje se pravo/i.test(text)) {
    findings.push({
      severity: "niska",
      title: "Nije izričito ugovoreno mjerodavno pravo",
      detail: "Ugovor ne sadrži klauzulu o mjerodavnom pravu — kod prekograničnih odnosa to stvara neizvjesnost.",
      preporuka: "Ugovoriti mjerodavno pravo Republike Hrvatske.",
    });
  }

  // 9) Pisani oblik izmjena
  if (!/izmjene .{0,40}pisan\w+ oblik|pisanom obliku/i.test(text)) {
    findings.push({
      severity: "niska",
      title: "Nema klauzule o pisanom obliku izmjena",
      detail: "Bez klauzule o pisanom obliku izmjena moguće su sporne usmene izmjene ugovora.",
      preporuka: "Dodati odredbu da su izmjene valjane samo u pisanom obliku.",
    });
  }

  const order: Record<string, number> = { visoka: 0, srednja: 1, niska: 2, ok: 3 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity]);
}
