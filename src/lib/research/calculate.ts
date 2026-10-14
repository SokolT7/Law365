import type { DeadlineCalculation } from "@/lib/research/types";

/** Deterministic deadline arithmetic: never left to the model. */

const NUMBER_WORDS: Record<string, number> = {
  jedan: 1, jednog: 1, dva: 2, dvaju: 2, tri: 3, triju: 3, cetiri: 4, pet: 5, sest: 6, sedam: 7, osam: 8, devet: 9, deset: 10, petnaest: 15,
  dvadeset: 20, trideset: 30, cetrdeset: 40, pedeset: 50, sezdeset: 60, devedeset: 90,
};
const MONTHS: Record<string, number> = {
  sijecnja: 1, veljace: 2, ozujka: 3, travnja: 4, svibnja: 5, lipnja: 6, srpnja: 7, kolovoza: 8, rujna: 9, listopada: 10, studenoga: 11, studenog: 11, prosinca: 12,
};

const fold = (s: string) => s.toLocaleLowerCase("hr").replace(/đ/g, "d").normalize("NFD").replace(/[̀-ͯ]/g, "");
const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86400000);

function easter(year: number): Date {
  // Anonymous Gregorian algorithm.
  const a = year % 19, b = Math.floor(year / 100), c = year % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(year, month, day);
}

/** Public holidays of the Republic of Croatia (current list), name by ISO date. */
export function croatianHolidays(year: number): Map<string, string> {
  const e = easter(year);
  const list: [Date, string][] = [
    [utc(year, 1, 1), "Nova godina"], [utc(year, 1, 6), "Bogojavljenje"], [e, "Uskrs"], [addDays(e, 1), "Uskrsni ponedjeljak"],
    [utc(year, 5, 1), "Praznik rada"], [utc(year, 5, 30), "Dan državnosti"], [addDays(e, 60), "Tijelovo"], [utc(year, 6, 22), "Dan antifašističke borbe"],
    [utc(year, 8, 5), "Dan pobjede i domovinske zahvalnosti"], [utc(year, 8, 15), "Velika Gospa"], [utc(year, 11, 1), "Svi sveti"],
    [utc(year, 11, 18), "Dan sjećanja na žrtve Domovinskog rata"], [utc(year, 12, 25), "Božić"], [utc(year, 12, 26), "Sveti Stjepan"],
  ];
  return new Map(list.map(([d, n]) => [iso(d), n]));
}

function parseDate(text: string): Date | null {
  const t = fold(text);
  const numeric = t.match(/\b(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{4})\.?/);
  if (numeric) return utc(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]));
  const written = t.match(/\b(\d{1,2})\.\s+([a-z]+)\s+(\d{4})/);
  if (written && MONTHS[written[2]]) return utc(Number(written[3]), MONTHS[written[2]], Number(written[1]));
  const isoDate = t.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoDate) return utc(Number(isoDate[1]), Number(isoDate[2]), Number(isoDate[3]));
  return null;
}

function parseDays(text: string): number | null {
  const t = fold(text);
  const digits = t.match(/\b(\d{1,3})\s*(?:\(\w+\)\s*)?dan(?:a|i)?\b/);
  if (digits) return Number(digits[1]);
  const words = t.match(new RegExp(`\\b(${Object.keys(NUMBER_WORDS).join("|")})\\s+dan(?:a|i)?\\b`));
  return words ? NUMBER_WORDS[words[1]] : null;
}

export const COUNTING_RULE = "Računanje prema ZPP čl. 112.: dan događaja ne uračunava se; ako rok istječe na nedjelju, blagdan ili drugi dan kad sud ne radi, istječe prvoga idućeg radnog dana.";

/** Days-based deadline from an explicit start; end moves past weekends and Croatian public holidays. */
export function computeDeadline(start: Date, days: number, label: string): DeadlineCalculation {
  const end = addDays(start, days);
  let adjusted = end;
  const reasons: string[] = [];
  for (let guard = 0; guard < 10; guard++) {
    const holidays = croatianHolidays(adjusted.getUTCFullYear());
    const name = holidays.get(iso(adjusted));
    const dow = adjusted.getUTCDay();
    if (!name && dow !== 0 && dow !== 6) break;
    reasons.push(name ?? (dow === 0 ? "nedjelja" : "subota"));
    adjusted = addDays(adjusted, 1);
  }
  return {
    label, start: iso(start), days, end: iso(end),
    adjustedEnd: adjusted.getTime() !== end.getTime() ? iso(adjusted) : undefined,
    adjustedReason: reasons.length ? `Rok bi istekao na dan kad sud ne radi (${reasons.join(", ")}).` : undefined,
    rule: COUNTING_RULE,
  };
}

/**
 * Finds "N dana od <datum>" in the question. If the question has a date but no period,
 * a period stated in the top source ("u roku od petnaest dana") is used and attributed.
 */
export function detectDeadline(question: string, sourceText?: { label: string; text: string }): DeadlineCalculation | null {
  const start = parseDate(question);
  if (!start || !/\brok|istjec|istice|zakasn|do kada|dokad/i.test(fold(question))) return null;
  const days = parseDays(question);
  if (days) return computeDeadline(start, days, `${days} dana od ${start.toLocaleDateString("hr-HR", { timeZone: "UTC" })}`);
  if (sourceText) {
    const fromSource = parseDays(sourceText.text.match(/u roku od [^.;]{0,40}?dan(?:a|i)/i)?.[0] ?? "");
    if (fromSource) return computeDeadline(start, fromSource, `${fromSource} dana prema ${sourceText.label}, od ${start.toLocaleDateString("hr-HR", { timeZone: "UTC" })}`);
  }
  return null;
}
