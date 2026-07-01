import Link from "next/link";
import { readDB } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, DocStatusBadge } from "@/components/ui";
import { overallStatus } from "@/lib/docs";
import { MODE_LABEL } from "@/lib/docs";
import { IFlag } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const db = await readDB();
  const client = db.clients.find((c) => c.id === id);

  if (!client) {
    return (
      <>
        <PageHeader title="Klijent nije pronađen" />
        <div className="content">
          <div className="empty">
            <Link href="/klijenti" className="t-title">← Natrag na klijente</Link>
          </div>
        </div>
      </>
    );
  }

  const docs = db.documents
    .filter((d) => d.clientId === id)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const matters = db.matters.filter((m) => m.clientId === id);
  const alerts = (db.regUpdates ?? []).filter((r) => r.affectedClientIds.includes(id));

  return (
    <>
      <PageHeader title={client.name} subtitle={client.sector}>
        <Link href="/klijenti" className="btn btn-sm">← Klijenti</Link>
      </PageHeader>
      <div className="content">
        <div className="grid grid-2" style={{ marginBottom: 18, alignItems: "start" }}>
          <div className="card card-pad">
            <div className="seg-label">Podaci o klijentu</div>
            <dl className="kv" style={{ marginTop: 10 }}>
              <dt>Naziv</dt>
              <dd>{client.name}</dd>
              {client.oib && (
                <>
                  <dt>OIB</dt>
                  <dd className="mono">{client.oib}</dd>
                </>
              )}
              <dt>Djelatnost</dt>
              <dd>{client.sector}</dd>
              {client.contact && (
                <>
                  <dt>Kontakt</dt>
                  <dd>{client.contact}</dd>
                </>
              )}
              <dt>Predmeti</dt>
              <dd>
                {matters.length === 0
                  ? "—"
                  : matters.map((m) => m.title).join("; ")}
              </dd>
            </dl>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Regulatorna upozorenja</h3>
              <Link href="/propisi" className="muted">Praćenje propisa →</Link>
            </div>
            <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {alerts.length === 0 && (
                <div className="empty" style={{ padding: "16px 0" }}>
                  Nema regulatornih promjena koje se odnose na ovog klijenta.
                </div>
              )}
              {alerts.map((r) => (
                <div key={r.id} className="flex" style={{ alignItems: "flex-start", gap: 10 }}>
                  <span className={`badge ${r.severity}`} style={{ flex: "none", marginTop: 1 }}>
                    <IFlag size={11} /> {r.severity}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "var(--navy)", fontSize: 13 }}>{r.title}</div>
                    <div className="t-sub" style={{ marginTop: 2 }}>
                      {r.source} · {formatDate(r.date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Dokumenti klijenta</h3>
            <span className="muted">{docs.length}</span>
          </div>
          {docs.length === 0 ? (
            <div className="empty">
              Nema dokumenata. <Link href="/dokumenti" className="t-title">Učitajte prvi →</Link>
            </div>
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
                      <Link href={`/dokumenti/${d.id}`} className="t-title">{d.title}</Link>
                      <div className="t-sub">{d.filename}</div>
                    </td>
                    <td className="t-sub">{d.type}</td>
                    <td>
                      {d.analyses.length === 0 ? (
                        <span className="badge neutral" style={{ fontSize: 10.5 }}>Učitano</span>
                      ) : (
                        <div className="flex" style={{ gap: 6, flexWrap: "wrap" }}>
                          <DocStatusBadge status={overallStatus(d)} />
                          <span className="t-sub" style={{ fontSize: 11 }}>
                            {d.analyses.map((a) => MODE_LABEL[a.mode]).join(" · ")}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="right mono t-sub">{formatDate(d.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
