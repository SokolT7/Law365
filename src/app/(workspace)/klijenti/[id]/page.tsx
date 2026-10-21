import Link from "next/link";
import { readWorkspaceDB as readDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { hasFeature } from "@/lib/features";
import { formatDate } from "@/lib/format";
import { PageHeader, DocStatusBadge, EmptyState, RelativeTime } from "@/components/ui";
import { UploadButton } from "@/components/shell/SearchTrigger";
import { overallStatus } from "@/lib/docs";
import { MODE_LABEL } from "@/lib/docs";
import { IArrowLeft, IArrowRight, IDocs, IFlag } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await workspaceSession("clients");
  const db = await readDB();
  const client = db.clients.find((c) => c.id === id);

  if (!client) {
    return (
      <>
        <PageHeader title="Klijent nije pronađen" back={{ href: "/klijenti", label: "Klijenti" }} />
        <div className="content">
          <div className="card"><EmptyState title="Klijent ne postoji ili vam nije dostupan" action={<Link href="/klijenti" className="btn btn-secondary btn-md"><IArrowLeft aria-hidden="true" />Natrag na klijente</Link>} /></div>
        </div>
      </>
    );
  }

  const docs = db.documents
    .filter((d) => d.clientId === id)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const matters = db.matters.filter((m) => m.clientId === id);
  const alerts = (db.regUpdates ?? []).filter((r) => r.affectedClientIds.includes(id));

  const alertsOpen = alerts.filter((r) => !r.reviewed);
  return (
    <>
      <PageHeader title={client.name} back={{ href: "/klijenti", label: "Klijenti" }}>
        {hasFeature(session.firm, "contract_review") && <UploadButton clientId={client.id} contract variant="secondary">Provjeri ugovor</UploadButton>}
        <UploadButton clientId={client.id}>Učitaj dokument</UploadButton>
      </PageHeader>
      <div className="content">
        <div className="split-330">
          <div className="col-stack">
            {hasFeature(session.firm, "documents") && <section className="card" aria-labelledby="client-docs">
              <div className="card-head"><h3 id="client-docs">Dokumenti</h3><span className="t-sub mono">{docs.length}</span></div>
              {docs.length === 0 ? <EmptyState icon={<IDocs />} title="Nema dokumenata" action={<UploadButton clientId={client.id}>Učitaj dokument</UploadButton>}>Ispustite datoteke bilo gdje na stranici — automatski se povezuju s ovim klijentom.</EmptyState> : <><div className="table-scroll desktop-doc-register"><table className="table">
                <thead><tr><th>Dokument</th><th>Obrade</th><th className="right">Dodano</th></tr></thead>
                <tbody>{docs.map((d) => <tr key={d.id} className="row-link">
                  <td><Link href={`/dokumenti/${d.id}`} className="t-title">{d.title}</Link><div className="t-sub">{d.type} · {d.filename}</div></td>
                  <td>{d.analyses.length === 0 ? <span className="badge neutral">Učitano</span> : <div className="badges"><DocStatusBadge status={overallStatus(d)} /><span className="t-sub">{d.analyses.map((a) => MODE_LABEL[a.mode]).join(" · ")}</span></div>}</td>
                  <td className="right t-sub mono"><RelativeTime iso={d.createdAt} /></td>
                </tr>)}</tbody>
              </table></div>
              <div className="mobile-doc-list">{docs.map((d) => <Link key={d.id} className="mobile-doc-item" href={`/dokumenti/${d.id}`}><span className="t-title">{d.title}</span><span className="t-sub">{d.type}</span><span className="mobile-doc-meta">{d.analyses.length ? <DocStatusBadge status={overallStatus(d)} /> : <span className="badge neutral">Učitano</span>}<span className="t-sub"><RelativeTime iso={d.createdAt} /></span></span></Link>)}</div></>}
            </section>}

            {hasFeature(session.firm, "regulatory_tracking") && <section className="card" aria-labelledby="client-regs">
              <div className="card-head"><h3 id="client-regs">Regulatorna upozorenja</h3><Link href={`/propisi?klijent=${client.id}&prikaz=sve`}>Sve promjene<IArrowRight aria-hidden="true" /></Link></div>
              {alerts.length === 0 ? <EmptyState icon={<IFlag />} title="Nema upozorenja">Nijedna praćena promjena propisa ne odnosi se na ovog klijenta.</EmptyState> : <ul className="attention-list">{alerts.map((r) => <li key={r.id}>
                <Link className="attention-row" href={`/propisi?klijent=${client.id}&prikaz=${r.reviewed ? "pregledano" : "novo"}`}>
                  <span className={`attention-icon ${r.reviewed ? "ok" : r.severity === "visoka" ? "hi" : "mid"}`} aria-hidden="true"><IFlag /></span>
                  <span className="attention-main"><span className="t-title">{r.title}</span><span className="t-sub">{r.source} · {formatDate(r.date)}{r.reviewed ? " · pregledano" : ""}</span></span>
                </Link>
              </li>)}</ul>}
            </section>}
          </div>

          <aside className="card card-pad" aria-label="Podaci o klijentu">
            <h3 className="upload-heading">Podaci o klijentu</h3>
            <dl className="kv">
              {client.oib && <><dt>OIB</dt><dd className="mono">{client.oib}</dd></>}
              <dt>Djelatnost</dt><dd>{client.sector || "—"}</dd>
              {client.contact && <><dt>Kontakt</dt><dd>{client.contact}</dd></>}
              <dt>Predmeti</dt><dd>{matters.length === 0 ? "—" : matters.map((m) => m.title).join("; ")}</dd>
              {alertsOpen.length > 0 && <><dt>Upozorenja</dt><dd><span className="badge visoka">{alertsOpen.length} nepregledano</span></dd></>}
            </dl>
          </aside>
        </div>
      </div>
    </>
  );
}
