import Link from "next/link";
import { readDB } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import DocumentResult from "@/components/DocumentResult";
import Poller from "@/components/Poller";
import ModeTabs from "@/components/ModeTabs";
import { analysisOf } from "@/lib/docs";
import { IAlert } from "@/components/Icons";
import type { AnalysisMode } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DocumentDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ prikaz?: string }>;
}) {
  const { id } = await params;
  const { prikaz } = await searchParams;
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
  const present = doc.analyses.map((a) => a.mode);

  let active: AnalysisMode | undefined;
  if ((prikaz === "sazetak" || prikaz === "detaljna") && present.includes(prikaz)) {
    active = prikaz;
  } else {
    active = [...doc.analyses].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
    )[0]?.mode;
  }
  const a = active ? analysisOf(doc, active) : undefined;

  return (
    <>
      <PageHeader title={doc.title} subtitle={`${doc.type}${client ? ` · ${client.name}` : ""}`}>
        <Link href="/dokumenti" className="btn btn-sm">← Dokumenti</Link>
      </PageHeader>
      <div className="content">
        <ModeTabs doc={doc} active={active ?? "sazetak"} />

        {!a && <div className="empty">Ova vrsta obrade još nije izrađena.</div>}

        {a?.status === "u_obradi" && <Poller documentId={doc.id} mode={a.mode} />}

        {a?.status === "greska" && (
          <div className="card card-pad" style={{ textAlign: "center", padding: "40px 24px" }}>
            <IAlert size={26} color="var(--hi-fg)" />
            <p style={{ fontWeight: 700, color: "var(--navy)", margin: "12px 0 4px" }}>
              Obrada nije uspjela
            </p>
            <p className="muted" style={{ fontSize: 13 }}>
              {a.error || "Došlo je do pogreške."} Pokušajte ponovno učitati dokument.
            </p>
            <div style={{ marginTop: 16 }}>
              <Link href="/dokumenti" className="btn btn-primary btn-sm">Učitaj novi dokument</Link>
            </div>
          </div>
        )}

        {a?.status === "analizirano" && a.result && <DocumentResult result={a.result} />}
      </div>
    </>
  );
}
