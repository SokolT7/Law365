import { notFound } from "next/navigation";
import Link from "next/link";
import { readWorkspaceDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { hasFeature } from "@/lib/features";
import { firmSources } from "@/lib/research/firm-sources";
import { Breadcrumbs, RelativeTime } from "@/components/ui";
import SearchTrigger from "@/components/shell/SearchTrigger";
import NotificationBell from "@/components/shell/NotificationBell";
import { IFile, IShield } from "@/components/Icons";
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
  if(analiza && analiza!=="tekst" && !modes.includes(analiza as AnalysisMode))notFound();
  const client=db.clients.find(c=>c.id===doc.clientId);
  const files=doc.files ?? [doc.filename];
  return <>
    <header className="document-header">
      <Breadcrumbs className="document-breadcrumbs" items={[{href:"/dokumenti",label:"Dokumenti"},...(client && client.name!=="Ručno učitani dokument" && hasFeature(session.firm,"clients")?[{href:`/klijenti/${client.id}`,label:client.name}]:[]),{label:doc.title}]}/>
      <div className="document-heading-row">
        <div><h1>{doc.title}</h1>
          <div className="document-meta"><span className="badge neutral">{doc.type || "Dokument"}</span><span>Dodano <RelativeTime iso={doc.createdAt}/></span>
            <details className="document-files"><summary><IFile size={14} aria-hidden="true"/>{files.length === 1 ? files[0] : `${files.length} datoteke`}</summary><ul>{files.map((file,index)=><li key={`${file}-${index}`}>{file}</li>)}</ul><p className="t-sub">Dostupan je izdvojeni tekst. Izvorne datoteke još nisu spremljene za preuzimanje.</p></details>
          </div>
        </div>
        <div className="page-actions"><SearchTrigger/><NotificationBell/>{hasFeature(session.firm,"contract_review") && <Link className="btn btn-secondary btn-md" href={`/provjera?dok=${doc.id}`}><IShield aria-hidden="true"/>Provjeri rizike</Link>}</div>
      </div>
    </header>
    <div className="content document-content"><DocumentWorkbench key={doc.id} doc={doc} modes={modes} chunks={db.chunks.filter(c=>c.documentId===id)} canChat={hasFeature(session.firm,"document_chat")} sources={firmSources(db).sources} canManageSources={session.user.role==="firm_admin" && hasFeature(session.firm,"source_settings")}/></div>
  </>;
}
