import Link from "next/link";
import { readDB } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import DocumentResult from "@/components/DocumentResult";
import DocumentChat from "@/components/DocumentChat";
import AnalysisActions from "@/components/AnalysisActions";
import ModeTabs from "@/components/ModeTabs";
import Poller from "@/components/Poller";
import { analysisOf } from "@/lib/docs";
import { defaultSources } from "@/lib/sources";
import { IAlert } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function DocumentWorkspace({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ analiza?: string }>;
}) {
  const { id } = await params;
  const { analiza } = await searchParams;
  const db = await readDB();
  const doc = db.documents.find((d) => d.id === id);

  if (!doc) {
    return (
      <>
        <PageHeader title="Dokument nije pronađen" />
        <div className="content">
          <div className="empty">
            <Link href="/dokumenti" className="t-title">← Natrag na dokumente</Link>
          </div>
        </div>
      </>
    );
  }

  const client = db.clients.find((c) => c.id === doc.clientId);
  const files = doc.files ?? [doc.filename];
  const filesLabel = files.length > 1 ? `${files.length} dokumenta` : files[0];

  // ----- Prikaz rezultata analize -----
  if (analiza === "sazetak" || analiza === "detaljna") {
    const a = analysisOf(doc, analiza);
    return (
      <>
        <PageHeader title={doc.title} subtitle={`${doc.type} · obrada dokumenta`}>
          <Link href={`/dokumenti/${id}`} className="btn btn-sm">← Razgovor</Link>
        </PageHeader>
        <div className="content">
          <ModeTabs doc={doc} active={analiza} />
          {!a && <div className="empty">Ova obrada još nije izrađena.</div>}
          {a?.status === "u_obradi" && <Poller documentId={doc.id} mode={a.mode} />}
          {a?.status === "greska" && (
            <div className="card card-pad" style={{ textAlign: "center", padding: "40px 24px" }}>
              <IAlert size={26} color="var(--hi-fg)" />
              <p style={{ fontWeight: 700, color: "var(--navy)", margin: "12px 0 4px" }}>
                Obrada nije uspjela
              </p>
              <p className="muted" style={{ fontSize: 13 }}>{a.error || "Došlo je do pogreške."}</p>
            </div>
          )}
          {a?.status === "analizirano" && a.result && <DocumentResult result={a.result} />}
        </div>
      </>
    );
  }

  // ----- Radni prostor (razgovor) -----
  return (
    <>
      <PageHeader title={doc.title} subtitle={`${filesLabel}${client ? ` · ${client.name}` : ""}`}>
        <Link href="/dokumenti" className="btn btn-sm">← Dokumenti</Link>
      </PageHeader>
      <div className="content">
        <AnalysisActions doc={doc} />
        <DocumentChat
          documentId={doc.id}
          initialMessages={doc.conversation ?? []}
          sources={db.settings?.sources ?? defaultSources()}
        />
      </div>
    </>
  );
}
