import { notFound } from "next/navigation";
import Link from "next/link";
import { readWorkspaceDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { hasFeature } from "@/lib/features";
import { defaultSources } from "@/lib/sources";
import { formatDate } from "@/lib/format";
import type { AnalysisMode } from "@/lib/types";
import DocumentWorkbench from "@/components/DocumentWorkbench";
export const dynamic="force-dynamic";
export default async function DocumentWorkspace({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{analiza?:string}>}) {
  const {id}=await params;
  const {analiza}=await searchParams;
  const session=await workspaceSession("documents");
  const db=await readWorkspaceDB();
  const doc=db.documents.find(d=>d.id===id);
  if(!doc) notFound();
  const modes:AnalysisMode[]=[];
  if(hasFeature(session.firm,"summary_analysis"))modes.push("sazetak");
  if(hasFeature(session.firm,"detailed_analysis"))modes.push("detaljna");
  if(analiza && !modes.includes(analiza as AnalysisMode))notFound();
  const client=db.clients.find(c=>c.id===doc.clientId);
  const files=doc.files ?? [doc.filename];
  return <>
    <header className="document-header">
      <nav className="document-breadcrumbs" aria-label="Putanja"><Link href="/dokumenti">Dokumenti</Link>{client && <><span>/</span><Link href={`/klijenti/${client.id}`}>{client.name}</Link></>}</nav>
      <div className="document-heading-row"><div><p className="workspace-kicker">RADNI PROSTOR DOKUMENTA</p><h1>{doc.title}</h1><p className="t-sub">{doc.type || "Dokument"} · Dodano {formatDate(doc.createdAt)}</p></div>{hasFeature(session.firm,"contract_review") && <Link className="btn" href={`/provjera?dok=${doc.id}`}>Provjeri ugovor ↗</Link>}</div>
      <details className="document-files"><summary>Priložene datoteke · {files.length}</summary><ul>{files.map((file,index)=><li key={`${file}-${index}`}>{file}</li>)}</ul><p className="t-sub">Dostupan je izdvojeni tekst. Izvorne datoteke još nisu spremljene za preuzimanje.</p></details>
    </header>
    <div className="content document-content"><DocumentWorkbench key={doc.id} doc={doc} modes={modes} chunks={db.chunks.filter(c=>c.documentId===id)} canChat={hasFeature(session.firm,"document_chat")} sources={db.settings?.sources ?? defaultSources()} canManageSources={session.user.role==="firm_admin" && hasFeature(session.firm,"source_settings")}/></div>
  </>;
}
