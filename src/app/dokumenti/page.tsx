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

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ klijent?: string }>;
}) {
  const { klijent } = await searchParams;
  const db = await readDB();

  const namedClients = db.clients.filter((c) => c.name !== "Ručno učitani dokument");
  const clientName = (id: string) => db.clients.find((c) => c.id === id)?.name;

  const docs = [...db.documents]
    .filter((d) => !klijent || d.clientId === klijent)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const activeClient = klijent ? db.clients.find((c) => c.id === klijent) : undefined;

  return (
    <>
      <PageHeader title="Dokumenti" subtitle="Učitavanje i analiza pravnih dokumenata" />
      <div className="content">
        <TenantBanner />

        {namedClients.length > 0 && (
          <div className="src-chips" style={{ marginBottom: 16 }}>
            <span className="lab">Klijent</span>
            <Link href="/dokumenti" className={`source-chip${!klijent ? " on" : ""}`}>
              <span className="sc-dot" /> Svi
            </Link>
            {namedClients.map((c) => (
              <Link
                key={c.id}
                href={`/dokumenti?klijent=${c.id}`}
                className={`source-chip${klijent === c.id ? " on" : ""}`}
              >
                <span className="sc-dot" /> {c.name.replace(/\s*d\.o\.o\.\s*$/i, "")}
              </Link>
            ))}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 330px", gap: 18, alignItems: "start" }}>
          <div className="card">
            <div className="card-head">
              <h3>{activeClient ? `Dokumenti — ${activeClient.name}` : "Svi dokumenti"}</h3>
              <span className="muted">{docs.length}</span>
            </div>
            {docs.length === 0 ? (
              <div className="empty">
                {activeClient
                  ? "Ovaj klijent još nema dokumenata."
                  : "Još nema dokumenata. Učitajte prvi dokument desno →"}
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Dokument</th>
                    <th>Klijent</th>
                    <th>Obrade</th>
                    <th className="right">Datum</th>
                  </tr>
                </thead>
                <tbody>
                  {docs.map((d) => {
                    const cn = clientName(d.clientId);
                    return (
                      <tr key={d.id} className="row-link">
                        <td>
                          <Link href={`/dokumenti/${d.id}`} className="t-title">
                            {d.title}
                          </Link>
                          <div className="t-sub">{d.type}</div>
                        </td>
                        <td className="t-sub">
                          {cn && cn !== "Ručno učitani dokument" ? (
                            <Link href={`/klijenti/${d.clientId}`} className="t-title" style={{ fontSize: 12.5 }}>
                              {cn}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td>
                          <div className="flex" style={{ gap: 6, flexWrap: "wrap" }}>
                            {d.analyses.length === 0 && (
                              <span className="badge neutral" style={{ fontSize: 10.5 }}>Učitano</span>
                            )}
                            {d.analyses.map((a) => (
                              <span key={a.mode} className={`badge ${STATUS_CLASS[a.status]}`} style={{ fontSize: 10.5 }}>
                                {MODE_LABEL[a.mode]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="right mono t-sub">{formatDate(d.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <UploadCard clients={namedClients.map((c) => ({ id: c.id, name: c.name }))} />
            <div className="card card-pad" style={{ fontSize: 12.5, color: "var(--muted)" }}>
              <b style={{ color: "var(--navy)" }}>Kako radi</b>
              <p style={{ margin: "6px 0 0" }}>
                Odaberite klijenta, učitajte dokument(e) i otvara se radni prostor: <b>razgovarajte</b> s
                dokumentom u chatu (uz priloge), ili jednim klikom pokrenite <b>Sažetak</b> ili{" "}
                <b>Detaljnu analizu</b>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
