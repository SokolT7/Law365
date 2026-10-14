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
import { EmptyState } from "./ui";
import { IAlert, ISummary } from "./Icons";

const DOT: Record<string, string> = { analizirano: "lo", u_obradi: "mid", greska: "hi" };

export default function DocumentWorkbench({ doc, modes, canChat, chunks, sources, canManageSources }: { doc: DocumentRec; modes: AnalysisMode[]; canChat: boolean; chunks: Chunk[]; sources: Record<string, boolean>; canManageSources: boolean }) {
  const params = useSearchParams();
  const requested = params.get("analiza");
  const active = modes.includes(requested as AnalysisMode) || requested === "tekst" ? requested : canChat ? "razgovor" : modes[0] || "tekst";
  const tab = (key: string, href: string, children: React.ReactNode) => <Link scroll={false} href={href} className={active === key ? "active" : ""} aria-current={active === key ? "page" : undefined}>{children}</Link>;
  return <EvidenceWorkspace documentTitle={doc.title} chunks={chunks}>
    <nav className="workbench-tabs" aria-label="Način rada s dokumentom">
      {canChat && tab("razgovor", `/dokumenti/${doc.id}`, "Razgovor")}
      {modes.map((mode) => {
        const analysis = analysisOf(doc, mode);
        return <span key={mode} className="contents">{tab(mode, `/dokumenti/${doc.id}?analiza=${mode}`, <>{MODE_LABEL[mode]}<span>{analysis ? <><i className={`tab-dot ${DOT[analysis.status]}`} aria-hidden="true" />{STATUS_LABEL[analysis.status]}</> : "Nije pokrenuto"}</span></>)}</span>;
      })}
      {tab("tekst", `/dokumenti/${doc.id}?analiza=tekst`, "Tekst")}
    </nav>
    {/* Keep the conversation mounted across mode changes: draft, attachments and scroll stay in memory. */}
    {canChat && <div hidden={active !== "razgovor"}><DocumentChat documentId={doc.id} initialMessages={doc.conversation ?? []} sources={sources} canManageSources={canManageSources} /></div>}
    {modes.map((mode) => {
      const analysis = analysisOf(doc, mode);
      return <section key={mode} hidden={active !== mode} aria-label={MODE_LABEL[mode]} className="analysis-pane">
        {!analysis && <div className="card"><EmptyState icon={<ISummary />} title={`${MODE_LABEL[mode]} još nije izrađen${mode === "detaljna" ? "a" : ""}`} action={<CreateAnalysisButton documentId={doc.id} mode={mode} label={MODE_LABEL[mode]} />}>Rezultat i izvori ostat će povezani u ovom radnom prostoru. Obrada obično traje 1–2 minute.</EmptyState></div>}
        {analysis?.status === "u_obradi" && <Poller documentId={doc.id} mode={mode} />}
        {analysis?.status === "greska" && <div className="card"><EmptyState icon={<IAlert />} title="Obrada nije uspjela" action={<CreateAnalysisButton documentId={doc.id} mode={mode} label={MODE_LABEL[mode]} />}><span role="alert">{analysis.error || "Obrada trenutačno nije dostupna."} Pokušajte ponovno.</span></EmptyState></div>}
        {analysis?.status === "analizirano" && analysis.result && <DocumentResult result={analysis.result} />}
      </section>;
    })}
    {active === "tekst" && <div className="card card-pad"><h3 className="upload-heading">Izdvojeni tekst dokumenta</h3>{chunks.length ? chunks.map((c) => <details className="evidence-section" key={c.id}><summary>{c.heading}</summary><p>{c.text}</p></details>) : <p className="t-sub">Tekst nije dostupan.</p>}</div>}
  </EvidenceWorkspace>;
}
