import type { DocumentRec } from "./types";
import { primaryResult } from "./docs";
const calendar = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zagreb", year: "numeric", month: "2-digit", day: "2-digit" });
/** Calendar comparison uses the firm's Croatian timezone, not the server's timezone. */
export function calendarDay(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(value)) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;
  // Reject normalized impossible dates such as February 30 instead of inventing a deadline.
  const rawDay = value.slice(0,10);
  if (new Date(`${rawDay}T12:00:00Z`).toISOString().slice(0,10) !== rawDay) return null;
  return value.length === 10 ? value : calendar.format(date);
}
export function collectDeadlines(documents: DocumentRec[], now = new Date()) {
  const today = calendar.format(now);
  const dates = documents.flatMap(doc => (primaryResult(doc)?.datumiIRokovi ?? []).flatMap((item,index) => {
    const day = item.datum ? calendarDay(item.datum) : null;
    return day ? [{ key:`${doc.id}-${index}`, documentId:doc.id, title:doc.title, description:item.opis, date:day, today:day===today }] : [];
  }));
  return {
    upcoming: dates.filter(item=>item.date>=today).sort((a,b)=>a.date.localeCompare(b.date)),
    past: dates.filter(item=>item.date<today).sort((a,b)=>b.date.localeCompare(a.date)),
  };
}
