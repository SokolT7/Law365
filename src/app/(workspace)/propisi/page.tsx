import Link from "next/link";
import { readWorkspaceDB as readDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import Pagination from "@/components/Pagination";
import { queryValue, paginate, matchesQuery, listHref, type ListParams } from "@/lib/list-query";
import { formatDate } from "@/lib/format";
import { PageHeader, TenantBanner } from "@/components/ui";
import RegReviewButton from "@/components/RegReviewButton";
import { IFlag } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function RegulatoryPage({
  searchParams,
}: {
  searchParams: Promise<ListParams>;
}) {
  const params = await searchParams;
  const prikaz = queryValue(params,"prikaz"), q = queryValue(params,"q"), vaznost = queryValue(params,"vaznost"), klijent = queryValue(params,"klijent");
  await workspaceSession("regulatory_tracking");
  const db = await readDB();
  const all = [...(db.regUpdates ?? [])].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const byState = prikaz === "pregledano" ? all.filter((r) => r.reviewed) : prikaz === "novo" ? all.filter((r) => !r.reviewed) : all;
  const filtered = byState.filter(r => matchesQuery(q, r.title, r.summary, r.source, ...r.areas)).filter(r => !vaznost || r.severity === vaznost).filter(r => !klijent || r.affectedClientIds.includes(klijent));
  const paging = paginate(filtered, queryValue(params,"stranica"));
  const items = paging.items;
  const filters = {prikaz, q, vaznost, klijent};
  const newCount = all.filter((r) => !r.reviewed).length;

  const clientName = (id: string) => db.clients.find((c) => c.id === id)?.name;

  return (
    <>
      <PageHeader
        title="Praćenje propisa"
        subtitle="Promjene zakona i regulative povezane s vašim klijentima i predmetima"
      />
      <div className="content">
        <TenantBanner />

        <div className="izvori-intro" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="ii-count"><b>{newCount}</b> / {all.length} novih promjena</div>
            <p className="ii-text">
              Pregled regulatornih promjena spremljenih za vaš ured, povezanih klijenata i preporučenih radnji. Vanjski regulatorni feedovi još nisu povezani.
            </p>
          </div>
          <div className="tabs" style={{ marginBottom: 0 }}>
            <Link href={listHref("/propisi",{...filters,prikaz:""})} className={`tab${!prikaz ? " active" : ""}`}>Sve</Link>
            <Link href={listHref("/propisi",{...filters,prikaz:"novo"})} className={`tab${prikaz === "novo" ? " active" : ""}`}>Novo</Link>
            <Link href={listHref("/propisi",{...filters,prikaz:"pregledano"})} className={`tab${prikaz === "pregledano" ? " active" : ""}`}>Pregledano</Link>
          </div>
        </div>

        <form className="register-toolbar" method="get">
          <input type="hidden" name="prikaz" value={prikaz}/>
          <label className="search-field"><span className="sr-only">Pretraži regulatorne promjene</span><input type="search" name="q" defaultValue={q} placeholder="Naziv, područje ili izvor…"/></label>
          <label><span className="sr-only">Važnost</span><select name="vaznost" defaultValue={vaznost}><option value="">Sve važnosti</option><option value="visoka">Visoka važnost</option><option value="srednja">Srednja važnost</option><option value="niska">Niska važnost</option></select></label>
          {db.clients.length > 0 && <label><span className="sr-only">Povezani klijent</span><select name="klijent" defaultValue={klijent}><option value="">Svi klijenti</option>{db.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
          <button className="btn" type="submit">Primijeni</button>
          {(q || vaznost || klijent || prikaz) && <Link className="btn btn-ghost" href="/propisi">Očisti filtre</Link>}
        </form>
        {items.length === 0 ? (
          <div className="card card-pad empty">
            Nema stavki u ovom prikazu.
            {all.length === 0 && " Nove stavke bit će dostupne nakon povezivanja izvora."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
            {items.map((r) => (
              <div key={r.id} className={`card card-pad reg-item${r.reviewed ? " reviewed" : ""}`}>
                <div className="reg-item-layout">
                  <div style={{ minWidth: 0 }}>
                    <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
                      <span className={`badge ${r.severity}`}>
                        <IFlag size={11} /> {r.severity === "visoka" ? "Visoka važnost" : r.severity === "srednja" ? "Srednja važnost" : "Niska važnost"}
                      </span>
                      {r.reviewed && <span className="badge odobren">Pregledano</span>}
                      <span className="t-sub mono">{formatDate(r.date)}</span>
                    </div>
                    <h3 style={{ fontSize: 15.5, margin: "10px 0 4px" }}>{r.title}</h3>
                    <div className="t-sub" style={{ marginBottom: 8 }}>{r.source}</div>
                    <p style={{ margin: 0, fontSize: 13.5, color: "#33405c", lineHeight: 1.6, maxWidth: 760 }}>
                      {r.summary}
                    </p>
                    {r.action && (
                      <div className="clause-ref" style={{ maxWidth: 760 }}>
                        <div className="ref-head">Preporučena radnja</div>
                        {r.action}
                      </div>
                    )}
                    <div className="flex wrap" style={{ gap: 6, marginTop: 12 }}>
                      {r.areas.map((a) => (
                        <span key={a} className="chip" style={{ fontSize: 11.5 }}>{a}</span>
                      ))}
                      {r.affectedClientIds.map((cid) => {
                        const name = clientName(cid);
                        return name ? (
                          <Link key={cid} href={`/klijenti/${cid}`} className="chip" style={{ fontSize: 11.5, color: "var(--navy)" }}>
                            → {name}
                          </Link>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div style={{ flex: "none" }}>
                    <RegReviewButton id={r.id} reviewed={!!r.reviewed} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <Pagination path="/propisi" filters={filters} {...paging}/>
      </div>
    </>
  );
}
