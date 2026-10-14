"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ChatCitation, Chunk } from "@/lib/types";

type Evidence = { title: string; heading: string; quote?: string; text?: string; matched?: boolean; documentId?: string; chunkId?: string };
const EvidenceContext = createContext<((evidence: Evidence) => void) | null>(null);
export function EvidenceButton({ citation }: { citation: ChatCitation }) {
  const open = useContext(EvidenceContext);
  if (!open) return <details className="cite"><summary>{citation.documentTitle} — {citation.heading}</summary><p>{citation.snippet}</p></details>;
  return <button type="button" className="evidence-link" onClick={()=>open({title:citation.documentTitle,heading:citation.heading,quote:citation.snippet,documentId:citation.documentId,chunkId:citation.chunkId})}><span className="evidence-link-label">Pogledaj izvor ↗</span><strong>{citation.documentTitle}</strong><span>{citation.heading}</span></button>;
}
export function AnalysisSource({ heading, quote }: { heading?: string; quote?: string }) {
  const open = useContext(EvidenceContext);
  if (!heading && !quote) return null;
  return open ? <button type="button" className="analysis-source" onClick={()=>open({title:"Izvor analize",heading:heading || "Citirani odlomak",quote})}>Pogledaj izvor{heading ? ` · ${heading}` : ""} ↗</button> : <details className="src"><summary>{heading || "Izvor"}</summary><p>{quote}</p></details>;
}

export default function EvidenceWorkspace({ children, documentTitle, chunks = [] }: { children:React.ReactNode; documentTitle?:string; chunks?:Chunk[] }) {
  const [selected,setSelected] = useState<Evidence | null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [query,setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const previousOverflow = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(()=>()=>{controller.current?.abort();if(previousOverflow.current!==null)document.body.style.overflow=previousOverflow.current;},[]);
  function showDrawer() { if (window.matchMedia("(max-width: 1199px)").matches && !dialog.current?.open) { previousOverflow.current=document.body.style.overflow; document.body.style.overflow="hidden"; dialog.current?.showModal(); } }
  function closeDrawer() { dialog.current?.close(); origin.current?.focus(); }
  function open(item:Evidence) {
    controller.current?.abort(); controller.current = new AbortController();
    origin.current = document.activeElement as HTMLElement;
    setError(""); setLoading(false);
    const exact = item.chunkId ? chunks.find(c=>c.id===item.chunkId && (!item.documentId || c.documentId===item.documentId)) : undefined;
    const quote = item.quote?.replace(/\s+/g," ").trim();
    // Never resolve an external citation to this document by title or a vague heading.
    const match = exact ?? (!item.documentId && item.title === "Izvor analize" && quote ? chunks.find(c=>c.text.replace(/\s+/g," ").includes(quote)) : undefined);
    setSelected({...item,title:match ? documentTitle || item.title : item.title,text:match?.text ?? item.text,matched:!!match || item.matched});
    showDrawer();
    if (item.documentId && item.chunkId && !exact) {
      setLoading(true);
      const signal=controller.current.signal;
      fetch(`/api/documents/${encodeURIComponent(item.documentId)}/evidence?chunk=${encodeURIComponent(item.chunkId)}`,{signal,cache:"no-store"}).then(async response=>{
        if (!response.ok) throw new Error("Izvor nije dostupan u vašem trenutačnom radnom prostoru.");
        const data=await response.json();
        if (!signal.aborted) setSelected({...item,title:data.documentTitle,heading:data.heading,text:data.text,matched:true});
      }).catch(err=>{if (!signal.aborted) setError(err instanceof Error ? err.message : "Izvor nije dostupan.");}).finally(()=>{if(!signal.aborted)setLoading(false);});
    }
  }
  function panel() {
    return <><div className="evidence-heading"><div><span className="workspace-kicker">PROVJERA IZVORA</span><h2>Dokumenti i dokazi</h2></div><button type="button" className="btn btn-sm evidence-close" onClick={closeDrawer}>Zatvori</button></div>
      <p className="evidence-disclaimer">Prikazan je izdvojeni tekst. Izvorne datoteke još nisu dostupne za pregled.</p>
      {selected ? <div className="evidence-reading"><button className="btn btn-ghost btn-sm" onClick={()=>{controller.current?.abort();setLoading(false);setError("");setSelected(null);}}>← Svi odlomci</button><h3>{selected.title}</h3><p className="t-sub">{selected.heading}</p>
        {selected.quote && <blockquote>{selected.quote}</blockquote>}
        {loading && <p role="status">Otvaranje izvora…</p>}{error && <p className="flash err" role="alert">{error}</p>}
        {!loading && !error && (selected.matched ? <><span className="badge niska">Povezano s izdvojenim tekstom</span><p className="evidence-text">{selected.text}</p></> : <p className="evidence-disclaimer">Citat nije automatski povezan s točnim odlomkom. Provjerite izdvojeni tekst prije oslanjanja na navod.</p>)}
      </div> : <><label className="field">Pretraži izdvojeni tekst<input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Riječ ili odredba…"/></label>
        <div className="evidence-chunks">{chunks.length ? chunks.filter(c=>`${c.heading} ${c.text}`.toLocaleLowerCase("hr").includes(query.toLocaleLowerCase("hr"))).map(c=><details key={c.id} className="evidence-section"><summary>{c.heading}</summary><p className="evidence-text">{c.text}</p></details>) : <div className="empty"><h3>Provjerite svaku referencu</h3><p>Odaberite izvor uz odgovor ili analizu. Ovdje će se otvoriti povezani odlomak.</p></div>}
        {chunks.length > 0 && !chunks.some(c=>`${c.heading} ${c.text}`.toLocaleLowerCase("hr").includes(query.toLocaleLowerCase("hr"))) && <p role="status" className="empty">Nema odlomaka za tu pretragu.</p>}</div></>}
    </>;
  }
  return <EvidenceContext.Provider value={open}><div className="evidence-workspace"><div className="work-pane"><button className="btn evidence-mobile-trigger" onClick={()=>{origin.current=document.activeElement as HTMLElement;showDrawer();}}>Dokumenti i dokazi ↗</button>{children}</div><aside className="evidence-pane" aria-label="Dokumenti i dokazi">{panel()}</aside></div>
    <dialog className="evidence-drawer" ref={dialog} aria-label="Dokumenti i dokazi" onClose={()=>{if(previousOverflow.current!==null){document.body.style.overflow=previousOverflow.current;previousOverflow.current=null;}origin.current?.focus();}} onClick={event=>{if(event.target===dialog.current)closeDrawer();}}>{panel()}</dialog>
  </EvidenceContext.Provider>;
}
