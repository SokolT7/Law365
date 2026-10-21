import { activeClientScope } from "@/lib/scope";
import ScopeNotice from "@/components/shell/ScopeNotice";
import Link from "next/link";
import { readWorkspaceDB as readDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { hasFeature } from "@/lib/features";
import { STATUS_LABEL } from "@/lib/format";
import { PageHeader, EmptyState, RelativeTime } from "@/components/ui";
import { UploadButton } from "@/components/shell/SearchTrigger";
import AutoFilter from "@/components/AutoFilter";
import { MODE_LABEL } from "@/lib/docs";
import Pagination from "@/components/Pagination";
import { IDocs, ISearch } from "@/components/Icons";
import { paginate, queryValue, matchesQuery, type ListParams } from "@/lib/list-query";
import type { DocStatus, DocumentRec } from "@/lib/types";

export const dynamic = "force-dynamic";

const INTERNAL_CLIENT = "Ručno učitani dokument";
const STATUS_CLASS: Record<DocStatus, string> = {
  analizirano: "niska",
  u_obradi: "srednja processing",
  greska: "visoka",
};

function Analyses({ doc }: { doc: DocumentRec }) {
  if (!doc.analyses.length) return <span className="badge neutral">Učitano</span>;
  return <>{doc.analyses.map((a) => <span key={a.mode} className={`badge ${STATUS_CLASS[a.status]}`}>{MODE_LABEL[a.mode]} · {STATUS_LABEL[a.status]}</span>)}</>;
}

export default async function DocumentsPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const explicitClient = queryValue(params, "klijent"), q = queryValue(params, "q"), status = queryValue(params, "status"), vrsta = queryValue(params, "vrsta"), redoslijed = queryValue(params, "redoslijed") || "novije";
  const session = await workspaceSession("documents");
  const db = await readDB();
  const scope = hasFeature(session.firm, "clients") ? await activeClientScope(db) : null;
  // An explicit filter wins; otherwise the workspace client scope applies.
  const klijent = explicitClient || scope?.id || "";

  const namedClients = db.clients.filter((c) => c.name !== INTERNAL_CLIENT);
  const clientName = (id: string) => { const name = db.clients.find((c) => c.id === id)?.name; return name && name !== INTERNAL_CLIENT ? name : undefined; };

  const filtered = [...db.documents]
    .filter((d) => !klijent || d.clientId === klijent)
    .filter((d) => matchesQuery(q, d.title, d.type, d.filename))
    .filter((d) => !vrsta || d.type === vrsta)
    .filter((d) => !status || (status === "ucitano" ? d.analyses.length === 0 : d.analyses.some((a) => a.status === status)))
    .sort((a, b) => redoslijed === "naziv" ? a.title.localeCompare(b.title, "hr") : redoslijed === "starije" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt));
  const paging = paginate(filtered, queryValue(params, "stranica"));
  const docs = paging.items;
  const filters = { q, klijent, status, vrsta, redoslijed };
  const filtering = !!(q || status || klijent || vrsta || redoslijed !== "novije");
  const types = [...new Set(db.documents.map((d) => d.type).filter(Boolean))].sort((a, b) => a.localeCompare(b, "hr"));
  const showClients = hasFeature(session.firm, "clients") && namedClients.length > 0;

  return (
    <>
      <PageHeader title="Dokumenti">
        <UploadButton />
      </PageHeader>
      <div className="content">
        <ScopeNotice scope={!explicitClient ? scope : null} />
        {db.documents.length > 0 && <AutoFilter resultLabel={filtering ? `${filtered.length} od ${db.documents.length}` : undefined} clearHref="/dokumenti" active={filtering}>
          <label className="search-field"><ISearch aria-hidden="true" /><span className="sr-only">Pretraži dokumente</span><input type="search" name="q" defaultValue={q} placeholder="Pretraži naziv, vrstu ili datoteku…" /></label>
          {showClients && <label><span className="sr-only">Klijent</span><select name="klijent" defaultValue={klijent}><option value="">Svi klijenti</option>{namedClients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          <label><span className="sr-only">Status dokumenta</span><select name="status" defaultValue={status}><option value="">Svi statusi</option><option value="ucitano">Učitano</option><option value="u_obradi">U obradi</option><option value="analizirano">Analizirano</option><option value="greska">Greška</option></select></label>
          {types.length > 1 && <label><span className="sr-only">Vrsta dokumenta</span><select name="vrsta" defaultValue={vrsta}><option value="">Sve vrste</option>{types.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>}
          <label><span className="sr-only">Redoslijed dokumenata</span><select name="redoslijed" defaultValue={redoslijed}><option value="novije">Najnovije prvo</option><option value="starije">Najstarije prvo</option><option value="naziv">Naziv A–Ž</option></select></label>
        </AutoFilter>}

        <div className="card">
          {docs.length === 0 ? (
            filtering
              ? <EmptyState icon={<ISearch />} title="Nema dokumenata za ove filtre" action={<Link className="btn btn-secondary btn-md" href="/dokumenti">Očisti filtre</Link>}>Promijenite pretragu ili uklonite neki od filtara.</EmptyState>
              : <EmptyState icon={<IDocs />} title="Još nema dokumenata" action={<UploadButton>Učitaj prvi dokument</UploadButton>}>Učitajte PDF, DOCX ili TXT. Datoteke možete i ispustiti bilo gdje na ovoj stranici.</EmptyState>
          ) : (
            <>
              <div className="desktop-doc-register table-scroll">
                <table className="table">
                  <thead><tr><th>Dokument</th>{showClients && <th>Klijent</th>}<th>Obrade</th><th className="right">Dodano</th></tr></thead>
                  <tbody>
                    {docs.map((d) => {
                      const cn = clientName(d.clientId);
                      return <tr key={d.id} className="row-link">
                        <td><Link href={`/dokumenti/${d.id}`} className="t-title">{d.title}</Link><div className="t-sub">{d.type}{d.files && d.files.length > 1 ? ` · ${d.files.length} datoteke` : d.filename ? ` · ${d.filename}` : ""}</div></td>
                        {showClients && <td>{cn ? <Link href={`/klijenti/${d.clientId}`}>{cn}</Link> : <span className="t-sub">Interno</span>}</td>}
                        <td><div className="badges"><Analyses doc={d} /></div></td>
                        <td className="right t-sub mono"><RelativeTime iso={d.createdAt} /></td>
                      </tr>;
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mobile-doc-list">{docs.map((d) => <Link className="mobile-doc-item" href={`/dokumenti/${d.id}`} key={d.id}>
                <span className="t-title">{d.title}</span>
                <span className="t-sub">{[d.type, clientName(d.clientId)].filter(Boolean).join(" · ")}</span>
                <span className="mobile-doc-meta"><span className="badges"><Analyses doc={d} /></span><span className="t-sub"><RelativeTime iso={d.createdAt} /></span></span>
              </Link>)}</div>
            </>
          )}
          {docs.length > 0 && <Pagination path="/dokumenti" filters={filters} {...paging} />}
        </div>
      </div>
    </>
  );
}
