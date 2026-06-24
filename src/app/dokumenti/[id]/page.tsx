import Link from "next/link";
import { readDB } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, SeverityBadge, AiNote } from "@/components/ui";
import FindingActions from "@/components/FindingActions";
import type { Severity } from "@/lib/types";

export const dynamic = "force-dynamic";

const ORDER: Record<Severity, number> = { visoka: 0, srednja: 1, niska: 2 };

export default async function DocumentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = readDB();
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
  const keyTerms = db.keyTerms.filter((k) => k.documentId === id);
  const obligations = db.obligations.filter((o) => o.documentId === id);
  const findings = db.findings
    .filter((f) => f.documentId === id)
    .sort((a, b) => ORDER[a.severity] - ORDER[b.severity]);
  const chunkById = (cid?: string) => (cid ? db.chunks.find((c) => c.id === cid) : undefined);

  return (
    <>
      <PageHeader title={doc.title} subtitle={`${doc.type} · ${client?.name ?? ""}`}>
        <Link href="/dokumenti" className="btn btn-sm">← Dokumenti</Link>
      </PageHeader>
      <div className="content">
        {/* Sažetak */}
        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <div className="flex between mb-8">
            <h3>Sažetak</h3>
            <AiNote label={doc.mode === "live" ? "Sažeo Claude — provjerite" : "Generirao AI — provjerite"} />
          </div>
          <p style={{ margin: 0, color: "#3a4660", lineHeight: 1.6 }}>{doc.summary}</p>
        </div>

        <div className="grid grid-2" style={{ marginBottom: 18 }}>
          {/* Ključni uvjeti */}
          <div className="card">
            <div className="card-head"><h3>Ključni uvjeti</h3></div>
            <div className="card-pad">
              {keyTerms.length === 0 ? (
                <div className="empty">Nema izdvojenih uvjeta.</div>
              ) : (
                <dl className="kv">
                  {keyTerms.map((k) => (
                    <div key={k.id} style={{ display: "contents" }}>
                      <dt>{k.label}</dt>
                      <dd>{k.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          </div>

          {/* Obveze i rokovi */}
          <div className="card">
            <div className="card-head"><h3>Obveze i rokovi</h3></div>
            <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {obligations.length === 0 ? (
                <div className="empty">Nema izdvojenih obveza.</div>
              ) : (
                obligations.map((o) => (
                  <div key={o.id} className="flex between" style={{ alignItems: "flex-start", gap: 12 }}>
                    <div style={{ fontSize: 13, color: "#3a4660", minWidth: 0 }}>{o.text}</div>
                    {o.dueDate && <span className="chip mono" style={{ flex: "none" }}>{formatDate(o.dueDate)}</span>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Nalazi pregleda */}
        <div className="card">
          <div className="card-head">
            <h3>Nalazi pregleda</h3>
            <span className="muted">{findings.length} prema standardima ureda</span>
          </div>
          {findings.length === 0 ? (
            <div className="empty">Nema nalaza — ugovor je u skladu sa standardima.</div>
          ) : (
            findings.map((f) => {
              const ch = chunkById(f.chunkId);
              return (
                <div key={f.id} className="finding">
                  <SeverityBadge severity={f.severity} />
                  <div className="body">
                    <div className="f-title">{f.title}</div>
                    <div className="f-detail">{f.detail}</div>
                    {ch && (
                      <div className="clause-ref">
                        <div className="ref-head">{ch.heading}</div>
                        {ch.text.replace(/\s+/g, " ").slice(0, 200)}…
                      </div>
                    )}
                  </div>
                  <div style={{ flex: "none" }}>
                    <FindingActions findingId={f.id} status={f.status} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
