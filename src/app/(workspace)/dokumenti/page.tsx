import Link from "next/link";
import { readWorkspaceDB as readDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { hasFeature } from "@/lib/features";
import { formatDate, STATUS_LABEL } from "@/lib/format";
import { PageHeader, TenantBanner } from "@/components/ui";
import UploadCard from "@/components/UploadCard";
import SourcesDropdown from "@/components/SourcesDropdown";
import { defaultSources } from "@/lib/sources";
import { MODE_LABEL } from "@/lib/docs";
import Pagination from "@/components/Pagination";
import { paginate, queryValue, matchesQuery, type ListParams } from "@/lib/list-query";
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
  searchParams: Promise<ListParams>;
}) {
  const params = await searchParams;
  const klijent = queryValue(params, "klijent"), q = queryValue(params, "q"), status = queryValue(params, "status"), vrsta = queryValue(params, "vrsta"), redoslijed = queryValue(params, "redoslijed") || "novije";
  const session = await workspaceSession("documents");
  const db = await readDB();

  const namedClients = db.clients.filter((c) => c.name !== "Ručno učitani dokument");
  const clientName = (id: string) => db.clients.find((c) => c.id === id)?.name;

  const filtered = [...db.documents]
    .filter((d) => !klijent || d.clientId === klijent)
    .filter((d) => matchesQuery(q, d.title, d.type, d.filename))
    .filter((d) => !vrsta || d.type === vrsta)
    .filter((d) => !status || (status === "ucitano" ? d.analyses.length === 0 : d.analyses.some(a => a.status === status)))
    .sort((a, b) => redoslijed === "naziv" ? a.title.localeCompare(b.title, "hr") : redoslijed === "starije" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
  const paging = paginate(filtered, queryValue(params, "stranica"));
  const docs = paging.items;
  const filters = { q, klijent, status, vrsta, redoslijed };
  const types = [...new Set(db.documents.map(d => d.type).filter(Boolean))].sort((a,b) => a.localeCompare(b,"hr"));

  const activeClient = klijent ? db.clients.find((c) => c.id === klijent) : undefined;

  return (
    <>
      <PageHeader title="Dokumenti" subtitle="Učitavanje i analiza pravnih dokumenata">
        {session.user.role === "firm_admin" && hasFeature(session.firm, "source_settings") && <SourcesDropdown sources={db.settings?.sources ?? defaultSources()} />}
      </PageHeader>
      <div className="content">
        <TenantBanner />
        <form className="register-toolbar" method="get">
          {namedClients.length > 0 && <label><span className="sr-only">Klijent</span><select name="klijent" defaultValue={klijent}><option value="">Svi klijenti</option>{namedClients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          <label className="search-field"><span className="sr-only">Pretraži dokumente</span><input type="search" name="q" defaultValue={q} placeholder="Pretraži naziv, vrstu ili datoteku…"/></label>
          <label><span className="sr-only">Status dokumenta</span><select name="status" defaultValue={status}><option value="">Svi statusi</option><option value="ucitano">Učitano</option><option value="u_obradi">U obradi</option><option value="analizirano">Analizirano</option><option value="greska">Greška</option></select></label>
          <label><span className="sr-only">Vrsta dokumenta</span><select name="vrsta" defaultValue={vrsta}><option value="">Sve vrste</option>{types.map(type => <option key={type} value={type}>{type}</option>)}</select></label>
          <label><span className="sr-only">Redoslijed dokumenata</span><select name="redoslijed" defaultValue={redoslijed}><option value="novije">Najnovije prvo</option><option value="starije">Najstarije prvo</option><option value="naziv">Naziv A–Ž</option></select></label>
          <button className="btn" type="submit">Primijeni</button>{(q||status||klijent||vrsta||redoslijed!=="novije")&&<Link className="btn btn-ghost" href="/dokumenti">Očisti filtre</Link>}
        </form>

        <div className="split-330">
          <div className="card">
            <div className="card-head">
              <h3>{activeClient ? `Dokumenti — ${activeClient.name}` : "Svi dokumenti"}</h3>
              <span className="muted">{filtered.length}</span>
            </div>
            {docs.length === 0 ? (
              <div className="empty">
                {q || status || vrsta || klijent ? "Nema dokumenata koji odgovaraju filtrima." : "Još nema dokumenata. Učitajte prvi dokument za početak."}
              </div>
            ) : (
              <><div className="desktop-doc-register table-scroll"><table className="table">
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
                                {MODE_LABEL[a.mode]} · {STATUS_LABEL[a.status]}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="right mono t-sub">{formatDate(d.createdAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table></div><div className="mobile-doc-list">{docs.map(d=><Link className="mobile-doc-item" href={`/dokumenti/${d.id}`} key={d.id}><span className="t-title">{d.title}</span><span className="t-sub">{d.type}{clientName(d.clientId) && clientName(d.clientId)!=="Ručno učitani dokument" ? ` · ${clientName(d.clientId)}` : ""}</span><span className="flex between"><span className="flex wrap">{d.analyses.length ? d.analyses.map(a=><span className={`badge ${STATUS_CLASS[a.status]}`} key={a.mode}>{MODE_LABEL[a.mode]} · {STATUS_LABEL[a.status]}</span>) : <span className="badge neutral">Učitano</span>}</span><span className="t-sub">{formatDate(d.createdAt)}</span></span></Link>)}</div></>
            )}
            <Pagination path="/dokumenti" filters={filters} {...paging} />
          </div>

          <div className="side-stack" id="upload">
            <UploadCard clients={namedClients.map((c) => ({ id: c.id, name: c.name }))} />
            <div className="card card-pad" style={{ fontSize: 13, color: "var(--muted)" }}>
              <b style={{ color: "var(--navy)" }}>Kako radi</b>
              <p style={{ margin: "6px 0 0" }}>
                Učitajte dokument i otvorite njegov radni prostor. Dostupni postupci prikazuju se prema funkcijama uključenima za vaš ured.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
