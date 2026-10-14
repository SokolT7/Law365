"use client";

import { Fragment, useState } from "react";
import type { DeadlineCalculation, SearchStep, SourceRecord, Verification } from "@/lib/research/types";
import { useEvidence } from "@/components/EvidenceWorkspace";
import { IAlert, ICalendar, ICheck, ICheckCircle, IChevronRight, ICopy } from "@/components/Icons";
import { useToast } from "@/components/Feedback";

/* ---------- Citation pill ---------- */

function CitationPill({ n, sources }: { n: number; sources: SourceRecord[] }) {
  const evidence = useEvidence();
  const source = sources.find((s) => s.n === n);
  if (!source) return null;
  const title = `${source.label}${source.heading ? ` — ${source.heading}` : ""}${source.kind === "firm" ? ` (${source.title})` : ""}`;
  return <button type="button" className={`cite-pill kind-${source.kind}`} title={title} onClick={() => evidence?.showSources(sources, n)}>
    <span aria-hidden="true">{source.kind === "firm" ? `${n}` : source.label}</span>
    <span className="sr-only">Izvor {n}: {title}</span>
  </button>;
}

/* ---------- Safe Markdown subset ---------- */

function inline(text: string, sources: SourceRecord[], key: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*\n]+\*\*|\[\d{1,3}\]|`[^`\n]+`|\*[^*\s\n][^*\n]*\*)/g);
  return parts.filter(Boolean).map((part, i) => {
    const k = `${key}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(part)) return <strong key={k}>{inline(part.slice(2, -2), sources, k)}</strong>;
    if (/^\[\d{1,3}\]$/.test(part)) return <CitationPill key={k} n={Number(part.slice(1, -1))} sources={sources} />;
    if (/^`[^`]+`$/.test(part)) return <code key={k}>{part.slice(1, -1)}</code>;
    if (/^\*[^*].*\*$/.test(part)) return <em key={k}>{part.slice(1, -1)}</em>;
    return <Fragment key={k}>{part}</Fragment>;
  });
}

type Block =
  | { type: "h"; level: number; text: string }
  | { type: "p"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "table"; head: string[]; rows: string[][] }
  | { type: "quote"; text: string };

function blocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r/g, "").split("\n");
  const out: Block[] = [];
  const cells = (line: string) => line.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) { out.push({ type: "h", level: heading[1].length, text: heading[2] }); continue; }
    if (line.trim().startsWith("|") && /^\s*\|?\s*:?-{3,}/.test(lines[i + 1] ?? "")) {
      const head = cells(line);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(cells(lines[i++]));
      i--;
      out.push({ type: "table", head, rows });
      continue;
    }
    if (/^\s*([-*•])\s+/.test(line) || /^\s*\d+[.)]\s+/.test(line)) {
      const ordered = /^\s*\d+[.)]\s+/.test(line);
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*•]\s+/).test(lines[i])) {
        items.push(lines[i].replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*•]\s+/, ""));
        i++;
      }
      i--;
      out.push({ type: ordered ? "ol" : "ul", items });
      continue;
    }
    if (line.startsWith(">")) { out.push({ type: "quote", text: line.replace(/^>\s?/, "") }); continue; }
    const para = [line];
    while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#{1,4}\s|\s*[-*•]\s|\s*\d+[.)]\s|\||>)/.test(lines[i + 1])) para.push(lines[++i]);
    out.push({ type: "p", text: para.join(" ") });
  }
  return out;
}

export function RichAnswer({ text, sources = [], streaming = false }: { text: string; sources?: SourceRecord[]; streaming?: boolean }) {
  return <div className={`rich-answer${streaming ? " streaming" : ""}`}>
    {blocks(text).map((b, i) => {
      const k = `b${i}`;
      switch (b.type) {
        case "h": { const Tag = (b.level <= 2 ? "h3" : "h4") as "h3" | "h4"; return <Tag key={k}>{inline(b.text, sources, k)}</Tag>; }
        case "ul": return <ul key={k}>{b.items.map((it, j) => <li key={j}>{inline(it, sources, `${k}-${j}`)}</li>)}</ul>;
        case "ol": return <ol key={k}>{b.items.map((it, j) => <li key={j}>{inline(it, sources, `${k}-${j}`)}</li>)}</ol>;
        case "table": return <div key={k} className="table-scroll"><table className="answer-table"><thead><tr>{b.head.map((h, j) => <th key={j}>{inline(h, sources, `${k}-h${j}`)}</th>)}</tr></thead><tbody>{b.rows.map((r, j) => <tr key={j}>{r.map((c, x) => <td key={x}>{inline(c, sources, `${k}-${j}-${x}`)}</td>)}</tr>)}</tbody></table></div>;
        case "quote": return <blockquote key={k}>{inline(b.text, sources, k)}</blockquote>;
        default: return <p key={k}>{inline(b.text, sources, k)}</p>;
      }
    })}
  </div>;
}

/* ---------- Search trace ---------- */

export function SearchTrace({ steps, sources, running }: { steps: SearchStep[]; sources?: SourceRecord[]; running: boolean }) {
  const [open, setOpen] = useState(false);
  if (!steps.length) return null;
  const searched = steps.filter((s) => s.count !== undefined);
  const summary = running
    ? steps.filter((s) => s.state === "running").at(-1)?.label ?? "Pretražujem izvore…"
    : `Pretraženo ${searched.length} ${searched.length === 1 ? "izvor" : "izvora"} · ${sources?.length ?? 0} ${sources?.length === 1 ? "pronađen odlomak" : "pronađenih odlomaka"}`;
  return <details className="search-trace" open={running || open} onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}>
    <summary>{running ? <span className="btn-spinner" aria-hidden="true" /> : <ICheck size={14} aria-hidden="true" />}<span>{summary}</span><IChevronRight size={14} className="chev" aria-hidden="true" /></summary>
    <ol>{steps.map((s) => <li key={s.id} className={s.state}>
      {s.state === "running" ? <span className="btn-spinner" aria-hidden="true" /> : <ICheck size={12} aria-hidden="true" />}
      <span className="trace-label">{s.label}</span>
      {s.detail && <span className="trace-detail">{s.detail}</span>}
    </li>)}</ol>
  </details>;
}

/* ---------- Verification, calculation, actions ---------- */

export function VerificationNote({ verification }: { verification?: Verification }) {
  if (!verification || !verification.totalSources) return null;
  const issues: string[] = [];
  if (verification.removedMarkers.length) issues.push(`uklonjeno ${verification.removedMarkers.length} neispravnih oznaka`);
  if (verification.uncitedParagraphs) issues.push(`${verification.uncitedParagraphs} ${verification.uncitedParagraphs === 1 ? "odlomak bez citata" : "odlomaka bez citata"}`);
  return verification.ok
    ? <span className="verify-note ok"><ICheckCircle size={14} aria-hidden="true" />Citati provjereni · {verification.citedSources}/{verification.totalSources} izvora korišteno</span>
    : <span className="verify-note warn"><IAlert size={14} aria-hidden="true" />Provjerite citate: {issues.join(", ") || "nijedan izvor nije citiran"}</span>;
}

const hrDate = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString("hr-HR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

export function CalculationCard({ calc }: { calc: DeadlineCalculation }) {
  return <div className="calc-card" role="note">
    <span className="calc-icon"><ICalendar aria-hidden="true" /></span>
    <div>
      <p className="calc-title">Rok istječe: <b>{hrDate(calc.adjustedEnd ?? calc.end)}</b></p>
      <p className="t-sub">{calc.label}{calc.adjustedEnd ? ` · kalendarski kraj ${hrDate(calc.end)}` : ""}</p>
      {calc.adjustedReason && <p className="t-sub">{calc.adjustedReason}</p>}
      <p className="t-sub calc-rule">{calc.rule} Izračunato programski, ne putem AI-ja.</p>
    </div>
  </div>;
}

export function AnswerActions({ text }: { text: string }) {
  const toast = useToast();
  return <div className="msg-actions">
    <button type="button" className="comp-icon" aria-label="Kopiraj odgovor" title="Kopiraj odgovor" onClick={() => navigator.clipboard?.writeText(text).then(() => toast({ message: "Odgovor je kopiran." }), () => toast({ tone: "error", message: "Kopiranje nije uspjelo." }))}><ICopy /></button>
  </div>;
}

export function SourceSummary({ sources }: { sources: SourceRecord[] }) {
  const evidence = useEvidence();
  if (!sources.length) return null;
  const groups = [["statute", "Propisi"], ["case", "Sudska praksa"], ["eu", "EU"], ["firm", "Dokumenti ureda"]] as const;
  return <div className="source-summary">
    {groups.map(([kind, label]) => { const n = sources.filter((s) => s.kind === kind).length; return n ? <span key={kind} className={`chip kind-${kind}`}>{label}<span className="count">{n}</span></span> : null; })}
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => evidence?.showSources(sources)}>Izvori ({sources.length})</button>
  </div>;
}
