"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { AnalysisMode, Chunk, DocumentRec } from "@/lib/types";
import { MODE_LABEL, analysisOf } from "@/lib/docs";
import { STATUS_LABEL } from "@/lib/format";
import DocumentChat from "./DocumentChat";
import DocumentResult from "./DocumentResult";
import CreateAnalysisButton from "./CreateAnalysisButton";
import Poller from "./Poller";
import EvidenceWorkspace from "./EvidenceWorkspace";

export default function DocumentWorkbench({doc,modes,canChat,chunks,sources,canManageSources}:{doc:DocumentRec;modes:AnalysisMode[];canChat:boolean;chunks:Chunk[];sources:Record<string,boolean>;canManageSources:boolean}) {
  const params=useSearchParams();
  const requested=params.get("analiza");
  const active=modes.includes(requested as AnalysisMode) ? requested : canChat ? "razgovor" : modes[0] || "tekst";
  return <EvidenceWorkspace documentTitle={doc.title} chunks={chunks}>
    <nav className="workbench-tabs" aria-label="Način rada s dokumentom">
      {canChat && <Link scroll={false} href={`/dokumenti/${doc.id}`} className={active==="razgovor"?"active":""} aria-current={active==="razgovor"?"page":undefined}>Razgovor</Link>}
      {modes.map(mode=><Link scroll={false} key={mode} href={`/dokumenti/${doc.id}?analiza=${mode}`} className={active===mode?"active":""} aria-current={active===mode?"page":undefined}>{MODE_LABEL[mode]}<span>{analysisOf(doc,mode) ? STATUS_LABEL[analysisOf(doc,mode)!.status] : "Nije izrađeno"}</span></Link>)}
    </nav>
    {/* Keep the conversation mounted across mode changes: draft, attachments and scroll stay in memory. */}
    {canChat && <div hidden={active!=="razgovor"}><DocumentChat documentId={doc.id} initialMessages={doc.conversation ?? []} sources={sources} canManageSources={canManageSources}/></div>}
    {modes.map(mode=>{const analysis=analysisOf(doc,mode);return <section key={mode} hidden={active!==mode} aria-label={MODE_LABEL[mode]} className="analysis-pane">
      {!analysis && <div className="empty"><h3>{MODE_LABEL[mode]}</h3><p>Pokrenite obradu ovog dokumenta. Rezultat i izvori ostat će povezani u ovom radnom prostoru.</p><CreateAnalysisButton documentId={doc.id} mode={mode} label={MODE_LABEL[mode]}/></div>}
      {analysis?.status==="u_obradi" && <Poller documentId={doc.id} mode={mode}/>}
      {analysis?.status==="greska" && <div className="empty"><h3>Obrada nije uspjela</h3><p role="alert">{analysis.error || "Obrada trenutačno nije dostupna."}</p><CreateAnalysisButton documentId={doc.id} mode={mode} label="ponovnu obradu"/></div>}
      {analysis?.status==="analizirano" && analysis.result && <DocumentResult result={analysis.result}/>}
    </section>;})}
    {active==="tekst" && <div className="card card-pad"><h3>Izdvojeni tekst dokumenta</h3><p className="muted">Otvorite odlomke u prikazu „Dokumenti i dokazi”.</p>{chunks.map(c=><details className="evidence-section" key={c.id}><summary>{c.heading}</summary><p className="evidence-text">{c.text}</p></details>)}</div>}
  </EvidenceWorkspace>;
}
