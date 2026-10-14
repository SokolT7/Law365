import { activeClientScope } from "@/lib/scope";
import ScopeNotice from "@/components/shell/ScopeNotice";
import Link from "next/link";
import { readWorkspaceDB as readDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import Pagination from "@/components/Pagination";
import AutoFilter from "@/components/AutoFilter";
import { queryValue, paginate, matchesQuery, listHref, type ListParams } from "@/lib/list-query";
import { formatDate } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui";
import RegReviewButton from "@/components/RegReviewButton";
import { IFlag, ICheckCircle, ISearch, IUsers } from "@/components/Icons";

export const dynamic = "force-dynamic";

const SEVERITY_LABEL: Record<string, string> = { visoka: "Visoka važnost", srednja: "Srednja važnost", niska: "Niska važnost" };

export default async function RegulatoryPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const prikaz = queryValue(params, "prikaz") || "novo", q = queryValue(params, "q"), vaznost = queryValue(params, "vaznost"), explicitClient = queryValue(params, "klijent");
  await workspaceSession("regulatory_tracking");
  const db = await readDB();
  const scope = await activeClientScope(db);
  const klijent = explicitClient || scope?.id || "";
  const all = [...(db.regUpdates ?? [])].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const byState = prikaz === "pregledano" ? all.filter((r) => r.reviewed) : prikaz === "sve" ? all : all.filter((r) => !r.reviewed);
  const filtered = byState.filter((r) => matchesQuery(q, r.title, r.summary, r.source, ...r.areas)).filter((r) => !vaznost || r.severity === vaznost).filter((r) => !klijent || r.affectedClientIds.includes(klijent));
  const paging = paginate(filtered, queryValue(params, "stranica"));
  const items = paging.items;
  const filters = { prikaz, q, vaznost, klijent };
  const newCount = all.filter((r) => !r.reviewed).length;
  const filtering = !!(q || vaznost || klijent);
  const clientName = (id: string) => db.clients.find((c) => c.id === id)?.name;
  const tab = (value: string, label: string, count?: number) => <Link className={`tab${prikaz === value ? " active" : ""}`} aria-current={prikaz === value ? "page" : undefined} href={listHref("/propisi", { ...filters, prikaz: value, stranica: "" })} scroll={false}>{label}{count !== undefined && <span className="count mono">{count}</span>}</Link>;

  return (
    <>
      <PageHeader title="Praćenje propisa" subtitle="Promjene zakona i regulative povezane s vašim klijentima. Vanjski regulatorni izvori još nisu povezani." />
      <div className="content">
        <ScopeNotice scope={!explicitClient ? scope : null} />
        <div className="toolbar-row">
          <nav className="tabs" aria-label="Prikaz">{tab("novo", "Nepregledano", newCount)}{tab("pregledano", "Pregledano", all.length - newCount)}{tab("sve", "Sve")}</nav>
          {all.length > 0 && <AutoFilter className="register-toolbar inline" resultLabel={filtering ? `${filtered.length} rezultata` : undefined} clearHref={listHref("/propisi", { prikaz })} active={filtering}>
            <input type="hidden" name="prikaz" value={prikaz} />
            <label className="search-field"><ISearch aria-hidden="true" /><span className="sr-only">Pretraži promjene</span><input type="search" name="q" defaultValue={q} placeholder="Naziv, područje ili izvor…" /></label>
            <label><span className="sr-only">Važnost</span><select name="vaznost" defaultValue={vaznost}><option value="">Sve važnosti</option><option value="visoka">Visoka</option><option value="srednja">Srednja</option><option value="niska">Niska</option></select></label>
            {db.clients.length > 0 && <label><span className="sr-only">Povezani klijent</span><select name="klijent" defaultValue={klijent}><option value="">Svi klijenti</option>{db.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          </AutoFilter>}
        </div>

        {items.length === 0 ? (
          <div className="card">{prikaz === "novo" && !filtering && all.length > 0
            ? <EmptyState icon={<ICheckCircle />} title="Sve je pregledano" action={<Link className="btn btn-secondary btn-md" href="/propisi?prikaz=pregledano">Prikaži pregledane</Link>}>Nove promjene propisa pojavit će se ovdje.</EmptyState>
            : <EmptyState icon={<IFlag />} title={filtering ? "Nema promjena za ove filtre" : "Nema stavki u ovom prikazu"}>{all.length === 0 ? "Promjene će biti dostupne nakon povezivanja regulatornih izvora." : "Promijenite pretragu ili prikaz."}</EmptyState>}
          </div>
        ) : (
          <div className="reg-list">
            {items.map((r) => (
              <article key={r.id} className={`card card-pad reg-item${r.reviewed ? " reviewed" : ""}`}>
                <div className="reg-item-layout">
                  <div>
                    <div className="badges">
                      <span className={`badge ${r.severity}`}>{SEVERITY_LABEL[r.severity]}</span>
                      {r.reviewed && <span className="badge niska">Pregledano</span>}
                      <span className="t-sub mono">{formatDate(r.date)} · {r.source}</span>
                    </div>
                    <h3>{r.title}</h3>
                    <p className="reg-summary">{r.summary}</p>
                    {r.action && <div className="clause-ref"><div className="ref-head">Preporučena radnja</div>{r.action}</div>}
                    <div className="badges section-gap">
                      {r.areas.map((a) => <span key={a} className="chip">{a}</span>)}
                      {r.affectedClientIds.map((cid) => { const name = clientName(cid); return name ? <Link key={cid} href={`/klijenti/${cid}`} className="chip"><IUsers size={14} aria-hidden="true" />{name}</Link> : null; })}
                    </div>
                  </div>
                  <RegReviewButton id={r.id} reviewed={!!r.reviewed} />
                </div>
              </article>
            ))}
          </div>
        )}
        <Pagination path="/propisi" filters={filters} {...paging} />
      </div>
    </>
  );
}
