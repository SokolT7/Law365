import Link from "next/link";
import { readDB } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, TenantBanner, DocStatusBadge } from "@/components/ui";
import UploadCard from "@/components/UploadCard";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const db = await readDB();
  const docs = [...db.documents].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)
  );

  return (
    <>
      <PageHeader title="Dokumenti" subtitle="Učitavanje i analiza pravnih dokumenata" />
      <div className="content">
        <TenantBanner />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 330px", gap: 18, alignItems: "start" }}>
          <div className="card">
            <div className="card-head">
              <h3>Svi dokumenti</h3>
              <span className="muted">{docs.length}</span>
            </div>
            {docs.length === 0 ? (
              <div className="empty">Još nema dokumenata. Učitajte prvi dokument desno →</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Dokument</th>
                    <th>Vrsta</th>
                    <th>Status</th>
                    <th className="right">Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => (
                    <tr key={d.id} className="row-link">
                      <td>
                        <Link href={`/dokumenti/${d.id}`} className="t-title">
                          {d.title}
                        </Link>
                        <div className="t-sub">{d.filename}</div>
                      </td>
                      <td className="t-sub">{d.type}</td>
                      <td><DocStatusBadge status={d.status} /></td>
                      <td className="right mono t-sub">{formatDate(d.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <UploadCard />
            <div className="card card-pad" style={{ fontSize: 12.5, color: "var(--muted)" }}>
              <b style={{ color: "var(--navy)" }}>Kako radi</b>
              <p style={{ margin: "6px 0 0" }}>
                Dokument se šalje vašem n8n toku, gdje ga Claude iščitava i izdvaja <b>sve</b> bitne
                podatke — sažetak, strane, iznose, datume, obveze i rokove — sa navedenim izvorom za
                svaku stavku.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
