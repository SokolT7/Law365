import Link from "next/link";
import { readDB } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, TenantBanner } from "@/components/ui";
import UploadCard from "@/components/UploadCard";
import { MODE_LABEL } from "@/lib/docs";
import type { DocStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_CLASS: Record<DocStatus, string> = {
  analizirano: "niska",
  u_obradi: "srednja",
  greska: "visoka",
};

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
                    <th>Obrade</th>
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
                      <td>
                        <div className="flex" style={{ gap: 6, flexWrap: "wrap" }}>
                          {d.analyses.map((a) => (
                            <span key={a.mode} className={`badge ${STATUS_CLASS[a.status]}`} style={{ fontSize: 10.5 }}>
                              {MODE_LABEL[a.mode]}
                            </span>
                          ))}
                        </div>
                      </td>
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
              <b style={{ color: "var(--navy)" }}>Sažetak vs. Detaljna</b>
              <p style={{ margin: "6px 0 0" }}>
                Odaberite <b>Sažetak</b> za kratki pregled glavnih točaka ili <b>Detaljnu analizu</b> za
                iscrpan prikaz svih podataka. Kasnije, na dokumentu, možete izraditi i drugu vrstu.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
