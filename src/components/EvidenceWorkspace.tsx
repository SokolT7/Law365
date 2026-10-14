"use client";
import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ChatCitation, Chunk } from "@/lib/types";
import type { SourceKind, SourceRecord } from "@/lib/research/types";
import { IAlert, IArrowLeft, IArrowUpRight, IBook, ICheckCircle, IChevronRight, IX } from "@/components/Icons";

type Evidence = { title: string; heading: string; quote?: string; text?: string; matched?: boolean; documentId?: string; chunkId?: string };
type EvidenceApi = { open: (evidence: Evidence) => void; showSources: (sources: SourceRecord[], focus?: number) => void };
const EvidenceContext = createContext<EvidenceApi | null>(null);
export function useEvidence() { return useContext(EvidenceContext); }

export const KIND_LABEL: Record<SourceKind, string> = { statute: "Propis", eu: "EU propis", case: "Sudska praksa", firm: "Dokument ureda" };
const TABS: { id: "all" | SourceKind; label: string }[] = [
  { id: "all", label: "Sve" }, { id: "statute", label: "Propisi" }, { id: "case", label: "Sudska praksa" }, { id: "eu", label: "EU" }, { id: "firm", label: "Dokumenti ureda" },
];

export function formatDecisionDate(iso?: string) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${Number(d)}. ${Number(m)}. ${y}.`;
}

/** Legacy citation chip (older saved answers without typed sources). */
export function EvidenceButton({ citation, index }: { citation: ChatCitation; index?: number }) {
  const api = useEvidence();
  if (!api) return <details className="cite"><summary>{citation.documentTitle} — {citation.heading}</summary><p>{citation.snippet}</p></details>;
  return <button type="button" className="evidence-link" title={`${citation.documentTitle} — ${citation.heading}`} onClick={() => api.open({ title: citation.documentTitle, heading: citation.heading, quote: citation.snippet, documentId: citation.documentId, chunkId: citation.chunkId })}>
    {index !== undefined && <span className="cite-num" aria-hidden="true">{index}</span>}
    <strong>{citation.heading || citation.documentTitle}</strong>
    <span className="sr-only">Otvori izvor: {citation.documentTitle}</span>
  </button>;
}

export function AnalysisSource({ heading, quote }: { heading?: string; quote?: string }) {
  const api = useEvidence();
  if (!heading && !quote) return null;
  return api ? <button type="button" className="analysis-source" onClick={() => api.open({ title: "Izvor analize", heading: heading || "Citirani odlomak", quote })}><IChevronRight size={14} aria-hidden="true" />Pogledaj izvor{heading ? ` · ${heading}` : ""}</button> : <details className="src"><summary>{heading || "Izvor"}</summary><p>{quote}</p></details>;
}

type FullText = {
  text: string; keywords?: string | null; versionNote?: string | null; originalText?: string | null;
  consolidatedWith?: string[]; pendingAmendments?: { citation: string; text: string }[];
};

function SourceCard({ source, onOpen }: { source: SourceRecord; onOpen: () => void }) {
  return <button type="button" className={`source-card kind-${source.kind}`} onClick={onOpen}>
    <span className="source-card-top"><span className="cite-num" aria-hidden="true">{source.n}</span><b>{source.label}</b><span className="source-kind">{KIND_LABEL[source.kind]}</span></span>
    <span className="source-card-title">{source.kind === "case" ? [source.decisionType?.split(" · ")[0], formatDecisionDate(source.decidedAt)].filter(Boolean).join(" · ") : source.heading || source.title}</span>
    <span className="source-card-excerpt">{source.excerpt}</span>
    {source.pendingAmendments?.length ? <span className="source-card-warn"><IAlert size={12} aria-hidden="true" />Provjerite izmjene</span>
      : !source.consolidatedWith && source.amendedBy?.length ? <span className="source-card-warn"><IAlert size={12} aria-hidden="true" />Naknadno mijenjano</span> : null}
  </button>;
}

/** Consolidation status of a statute article: built-in amendments, and anything that still needs a manual check. */
function ConsolidationNote({ source, body }: { source: SourceRecord; body?: FullText }) {
  const pending = body?.pendingAmendments ?? source.pendingAmendments ?? [];
  const applied = body?.consolidatedWith ?? source.consolidatedWith ?? [];
  if (pending.length) return <div className="flash warn"><IAlert size={16} aria-hidden="true" /><div>
    <span>Dio izmjena ({[...new Set(pending.map((p) => p.citation))].join(", ")}) nije automatski ugrađen u ovaj članak. Provjerite odredbu u službenom pročišćenom tekstu.</span>
    <details className="consolidation-pending"><summary>Neugrađene upute ({pending.length})</summary><ul>{pending.map((p, i) => <li key={i}><b>{p.citation}</b> {p.text}</li>)}</ul></details>
  </div></div>;
  if (applied.length) return <p className="consolidation-ok"><ICheckCircle size={14} aria-hidden="true" />Pročišćeno automatski · ugrađene izmjene {applied.join(", ")}</p>;
  if (source.amendedBy?.length) return <p className="flash warn"><IAlert size={16} aria-hidden="true" /><span>Članak je naknadno mijenjan ({source.amendedBy.join(", ")}). Prikazan je tekst iz izvornog objavljivanja — provjerite pročišćeni tekst.</span></p>;
  return null;
}

export default function EvidenceWorkspace({ children, documentTitle, chunks = [] }: { children: React.ReactNode; documentTitle?: string; chunks?: Chunk[] }) {
  const [selected, setSelected] = useState<Evidence | null>(null);
  const [sources, setSources] = useState<SourceRecord[]>([]);
  const [focus, setFocus] = useState<SourceRecord | null>(null);
  const [tab, setTab] = useState<"all" | SourceKind>("all");
  const [full, setFull] = useState<Record<string, FullText>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const previousOverflow = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const [paneWidth, setPaneWidth] = useState<number | null>(null);
  const dragging = useRef(false);
  const workspace = useRef<HTMLDivElement>(null);
  const latestWidth = useRef<number | null>(null);
  // Never squeeze the conversation below 420px.
  const clampWidth = (w: number) => {
    const room = workspace.current ? workspace.current.getBoundingClientRect().width - 430 : 640;
    return Math.round(Math.min(640, Math.max(300, room), Math.max(300, w)));
  };
  useEffect(() => { try { const saved = Number(localStorage.getItem("ltb:evidence-width")); if (saved) setPaneWidth(clampWidth(saved)); } catch { /* storage unavailable */ } }, []);
  const persistWidth = (w: number) => { try { localStorage.setItem("ltb:evidence-width", String(w)); } catch { /* storage unavailable */ } };
  function startDrag(event: React.PointerEvent) {
    dragging.current = true;
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
  }
  function onDrag(event: React.PointerEvent) {
    if (!dragging.current || !workspace.current) return;
    const right = workspace.current.getBoundingClientRect().right;
    const next = clampWidth(right - event.clientX - 10);
    latestWidth.current = next;
    setPaneWidth(next);
  }
  function endDrag() { if (!dragging.current) return; dragging.current = false; if (latestWidth.current) persistWidth(latestWidth.current); }
  function onHandleKey(event: React.KeyboardEvent) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const next = clampWidth((paneWidth ?? 360) + (event.key === "ArrowLeft" ? 24 : -24));
    setPaneWidth(next); persistWidth(next);
  }
  useEffect(() => () => { controller.current?.abort(); if (previousOverflow.current !== null) document.body.style.overflow = previousOverflow.current; }, []);

  function showDrawer() { if (window.matchMedia("(max-width: 1199px)").matches && !dialog.current?.open) { previousOverflow.current = document.body.style.overflow; document.body.style.overflow = "hidden"; dialog.current?.showModal(); } }
  function closeDrawer() { dialog.current?.close(); origin.current?.focus(); }

  function loadFull(source: SourceRecord) {
    if (full[source.id]) return;
    controller.current?.abort(); controller.current = new AbortController();
    const signal = controller.current.signal;
    setError(""); setLoading(true);
    const url = source.kind === "firm"
      ? `/api/documents/${encodeURIComponent(source.documentId ?? "")}/evidence?chunk=${encodeURIComponent(source.chunkId ?? "")}`
      : `/api/legal/units/${encodeURIComponent(source.id)}`;
    const local = source.kind === "firm" ? chunks.find((c) => c.id === source.chunkId) : undefined;
    if (local) { setFull((f) => ({ ...f, [source.id]: { text: local.text } })); setLoading(false); return; }
    fetch(url, { signal, cache: "no-store" }).then(async (response) => {
      if (!response.ok) throw new Error("Puni tekst izvora trenutačno nije dostupan. Prikazan je odlomak korišten u odgovoru.");
      const data = await response.json();
      if (!signal.aborted) setFull((f) => ({ ...f, [source.id]: { text: data.text, keywords: data.keywords, versionNote: data.versionNote, originalText: data.originalText, consolidatedWith: data.consolidatedWith, pendingAmendments: data.pendingAmendments } }));
    }).catch((err) => { if (!signal.aborted) setError(err instanceof Error ? err.message : "Izvor nije dostupan."); })
      .finally(() => { if (!signal.aborted) setLoading(false); });
  }

  const api = useMemo<EvidenceApi>(() => ({
    open(item) {
      controller.current?.abort(); controller.current = new AbortController();
      origin.current = document.activeElement as HTMLElement;
      setError(""); setLoading(false); setFocus(null);
      const exact = item.chunkId ? chunks.find((c) => c.id === item.chunkId && (!item.documentId || c.documentId === item.documentId)) : undefined;
      const quote = item.quote?.replace(/\s+/g, " ").trim();
      // Never resolve an external citation to this document by title or a vague heading.
      const match = exact ?? (!item.documentId && item.title === "Izvor analize" && quote ? chunks.find((c) => c.text.replace(/\s+/g, " ").includes(quote)) : undefined);
      setSelected({ ...item, title: match ? documentTitle || item.title : item.title, text: match?.text ?? item.text, matched: !!match || item.matched });
      showDrawer();
      if (item.documentId && item.chunkId && !exact) {
        setLoading(true);
        const signal = controller.current.signal;
        fetch(`/api/documents/${encodeURIComponent(item.documentId)}/evidence?chunk=${encodeURIComponent(item.chunkId)}`, { signal, cache: "no-store" }).then(async (response) => {
          if (!response.ok) throw new Error("Izvor nije dostupan u vašem trenutačnom radnom prostoru.");
          const data = await response.json();
          if (!signal.aborted) setSelected({ ...item, title: data.documentTitle, heading: data.heading, text: data.text, matched: true });
        }).catch((err) => { if (!signal.aborted) setError(err instanceof Error ? err.message : "Izvor nije dostupan."); }).finally(() => { if (!signal.aborted) setLoading(false); });
      }
    },
    showSources(list, n) {
      origin.current = document.activeElement as HTMLElement;
      setSelected(null); setError(""); setSources(list); setTab("all");
      const target = n ? list.find((s) => s.n === n) ?? null : null;
      setFocus(target);
      if (target) loadFull(target);
      showDrawer();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [chunks, documentTitle, full]);

  const counts = useMemo(() => Object.fromEntries(TABS.map((t) => [t.id, t.id === "all" ? sources.length : sources.filter((s) => s.kind === t.id).length])), [sources]);
  const visible = tab === "all" ? sources : sources.filter((s) => s.kind === tab);

  function focusView(source: SourceRecord) {
    const body = full[source.id];
    return <div className="evidence-reading">
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => { controller.current?.abort(); setLoading(false); setError(""); setFocus(null); }}><IArrowLeft aria-hidden="true" />Svi izvori ({sources.length})</button>
      <div className="source-detail-head"><span className="cite-num" aria-hidden="true">{source.n}</span><div><h3>{source.label}</h3><p className="t-sub">{source.kind === "case" ? source.court : source.title}{source.heading ? ` · ${source.heading}` : ""}</p></div></div>
      {source.kind === "case" && <dl className="source-meta">
        {source.decidedAt && <><dt>Datum odluke</dt><dd>{formatDecisionDate(source.decidedAt)}</dd></>}
        {source.decisionType && <><dt>Vrsta</dt><dd>{source.decisionType}</dd></>}
        {source.ecli && <><dt>ECLI</dt><dd className="mono">{source.ecli}</dd></>}
        {body?.keywords && <><dt>Stvarno kazalo</dt><dd>{body.keywords}</dd></>}
      </dl>}
      <ConsolidationNote source={source} body={body} />
      <p className="evidence-label">Odlomak korišten u odgovoru</p>
      <blockquote>{source.excerpt}</blockquote>
      {loading && <div aria-hidden="true"><span className="skeleton skeleton-line" style={{ width: "94%" }} /><span className="skeleton skeleton-line" style={{ width: "88%" }} /><span className="skeleton skeleton-line" style={{ width: "72%" }} /></div>}
      {error && <p className="flash err" role="alert">{error}</p>}
      {body && body.text !== source.excerpt && <details className="evidence-full" open={source.kind !== "case"}><summary>{source.kind === "case" ? "Puni tekst odluke" : source.kind === "firm" ? "Cijeli odlomak dokumenta" : "Puni tekst članka"}</summary><p className="evidence-text">{body.text}</p></details>}
      {body?.originalText && <details className="evidence-full"><summary>Izvorni tekst (prije izmjena)</summary><p className="evidence-text">{body.originalText}</p></details>}
      {(body?.versionNote || source.versionNote) && <p className="t-sub source-version">{body?.versionNote ?? source.versionNote}</p>}
      {source.url && <a className="btn btn-secondary btn-sm source-official" href={source.url} target="_blank" rel="noopener noreferrer">Otvori na službenom izvoru<IArrowUpRight aria-hidden="true" /></a>}
    </div>;
  }

  function panel() {
    return <>
      <div className="evidence-heading"><h2>Izvori i dokazi</h2><button type="button" className="btn btn-ghost btn-sm btn-icon evidence-close" aria-label="Zatvori" onClick={closeDrawer}><IX aria-hidden="true" /></button></div>
      {focus ? focusView(focus) : selected ? <div className="evidence-reading">
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { controller.current?.abort(); setLoading(false); setError(""); setSelected(null); }}><IArrowLeft aria-hidden="true" />{sources.length ? `Svi izvori (${sources.length})` : "Svi odlomci"}</button>
        <h3>{selected.title}</h3><p className="t-sub">{selected.heading}</p>
        {selected.quote && <blockquote>{selected.quote}</blockquote>}
        {loading && <p role="status">Otvaranje izvora…</p>}{error && <p className="flash err" role="alert">{error}</p>}
        {!loading && !error && (selected.matched ? <><span className="badge niska"><ICheckCircle aria-hidden="true" />Povezano s izdvojenim tekstom</span><p className="evidence-text">{selected.text}</p></> : <p className="evidence-disclaimer">Citat nije automatski povezan s točnim odlomkom. Provjerite izdvojeni tekst prije oslanjanja na navod.</p>)}
      </div> : sources.length ? <>
        <div className="source-tabs" role="tablist" aria-label="Vrsta izvora">
          {TABS.filter((t) => t.id === "all" || counts[t.id] > 0).map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`chip${tab === t.id ? " selected" : ""}`} onClick={() => setTab(t.id)}>{t.label}<span className="count">{counts[t.id]}</span></button>)}
        </div>
        <div className="source-list">{visible.map((s) => <SourceCard key={s.id} source={s} onOpen={() => { setFocus(s); loadFull(s); }} />)}</div>
      </> : <>
        <p className="evidence-disclaimer">Kliknite oznaku izvora uz odgovor — članak, odluka ili odlomak otvorit će se ovdje.</p>
        {chunks.length > 0 && <label className="field"><span className="sr-only">Pretraži izdvojeni tekst</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pretraži tekst dokumenta…" /></label>}
        <div className="evidence-chunks">{chunks.length ? chunks.filter((c) => `${c.heading} ${c.text}`.toLocaleLowerCase("hr").includes(query.toLocaleLowerCase("hr"))).map((c) => <details key={c.id} className="evidence-section"><summary>{c.heading}</summary><p className="evidence-text">{c.text}</p></details>) : <div className="empty"><span className="empty-icon" aria-hidden="true"><IBook /></span><h3>Provjerite svaku referencu</h3><p>Svaka tvrdnja u odgovoru nosi oznaku izvora.</p></div>}
          {chunks.length > 0 && !chunks.some((c) => `${c.heading} ${c.text}`.toLocaleLowerCase("hr").includes(query.toLocaleLowerCase("hr"))) && <p role="status" className="empty">Nema odlomaka za tu pretragu.</p>}</div>
      </>}
    </>;
  }

  return <EvidenceContext.Provider value={api}>
    <div className="evidence-workspace" ref={workspace} style={paneWidth ? ({ "--evidence-w": `${paneWidth}px` } as React.CSSProperties) : undefined}>
      <div className="work-pane"><button type="button" className="btn btn-secondary btn-sm evidence-mobile-trigger" onClick={() => { origin.current = document.activeElement as HTMLElement; showDrawer(); }}><IBook aria-hidden="true" />Izvori i dokazi{sources.length ? ` (${sources.length})` : ""}</button>{children}</div>
      <div className="evidence-resizer" role="separator" aria-orientation="vertical" aria-label="Promijeni širinu panela izvora" aria-valuemin={300} aria-valuemax={640} aria-valuenow={paneWidth ?? 360} tabIndex={0}
        onPointerDown={startDrag} onPointerMove={onDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onKeyDown={onHandleKey} onDoubleClick={() => { setPaneWidth(360); persistWidth(360); }} />
      <aside className="evidence-pane" aria-label="Izvori i dokazi">{panel()}</aside>
    </div>
    <dialog className="evidence-drawer" ref={dialog} aria-label="Izvori i dokazi" onClose={() => { if (previousOverflow.current !== null) { document.body.style.overflow = previousOverflow.current; previousOverflow.current = null; } origin.current?.focus(); }} onClick={(event) => { if (event.target === dialog.current) closeDrawer(); }}>{panel()}</dialog>
  </EvidenceContext.Provider>;
}
