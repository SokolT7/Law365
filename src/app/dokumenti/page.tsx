import Link from "next/link";
import { readDB } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, TenantBanner } from "@/components/ui";
import UploadCard from "@/components/UploadCard";

export const dynamic = "force-dynamic";

export default function DocumentsPage() {
  const db = readDB();
  const docs = [...db.documents].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );
  const clientName = (id: string) => db.clients.find((c) => c.id === id)?.name ?? "—";

  return (
    <>
      <PageHeader title="Dokumenti" subtitle="Učitavanje i automatska analiza ugovora" />
      <div className="content">
        <TenantBanner />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 330px", gap: 18, alignItems: "start" }}>
          <div className="card">
            <div className="card-head">
              <h3>Svi dokumenti</h3>
              <span className="muted">{docs.length}</span>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Dokument</th>
                  <th>Vrsta</th>
                  <th>Nalazi</th>
                  <th className="right">Datum</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => {
                  const fc = db.findings.filter((f) => f.documentId === d.id);
                  const hi = fc.filter((f) => f.severity === "visoka").length;
                  return (
                    <tr key={d.id} className="row-link">
                      <td>
                        <Link href={`/dokumenti/${d.id}`} className="t-title">
                          {d.title}
                        </Link>
                        <div className="t-sub">{clientName(d.clientId)}</div>
                      </td>
                      <td className="t-sub">{d.type}</td>
                      <td>
                        {fc.length === 0 ? (
                          <span className="chip">bez nalaza</span>
                        ) : (
                          <span className={`badge ${hi ? "visoka" : "neutral"}`}>
                            {fc.length} {fc.length === 1 ? "nalaz" : "nalaza"}
                            {hi ? ` · ${hi} visok` : ""}
                          </span>
                        )}
                      </td>
                      <td className="right mono t-sub">{formatDate(d.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <UploadCard />
            <div className="card card-pad" style={{ fontSize: 12.5, color: "var(--muted)" }}>
              <b style={{ color: "var(--navy)" }}>Savjet za demo</b>
              <p style={{ margin: "6px 0 0" }}>
                Učitajte bilo koji ugovor (.txt, .docx ili .pdf) i pratite kako ga sustav klasificira,
                sažima i pregledava prema standardima ureda — u stvarnom vremenu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
