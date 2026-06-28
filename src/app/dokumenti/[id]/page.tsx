import Link from "next/link";
import { readDB } from "@/lib/db";
import { PageHeader } from "@/components/ui";
import DocumentResult from "@/components/DocumentResult";
import Poller from "@/components/Poller";
import { IAlert } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function DocumentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
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

  return (
    <>
      <PageHeader title={doc.title} subtitle={`${doc.type}${client ? ` · ${client.name}` : ""}`}>
        <Link href="/dokumenti" className="btn btn-sm">← Dokumenti</Link>
      </PageHeader>
      <div className="content">
        {doc.status === "u_obradi" && <Poller documentId={doc.id} />}

        {doc.status === "greska" && (
          <div className="card card-pad" style={{ textAlign: "center", padding: "40px 24px" }}>
            <IAlert size={26} color="var(--hi-fg)" />
            <p style={{ fontWeight: 700, color: "var(--navy)", margin: "12px 0 4px" }}>
              Analiza nije uspjela
            </p>
            <p className="muted" style={{ fontSize: 13 }}>
              {doc.error || "Došlo je do pogreške."} Provjerite n8n tok i pokušajte ponovno učitati dokument.
            </p>
            <div style={{ marginTop: 16 }}>
              <Link href="/dokumenti" className="btn btn-primary btn-sm">Ponovno učitaj</Link>
            </div>
          </div>
        )}

        {doc.status === "analizirano" && doc.result && <DocumentResult result={doc.result} />}
      </div>
    </>
  );
}
