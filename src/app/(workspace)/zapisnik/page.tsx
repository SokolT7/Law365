import Link from "next/link";
import { readWorkspaceDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { formatDateTime } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import Pagination from "@/components/Pagination";
import { FEATURE_CATALOG } from "@/lib/features";
import { matchesQuery, paginate, queryValue, type ListParams } from "@/lib/list-query";
export const dynamic = "force-dynamic";

export default async function AuditPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  await workspaceSession("activity_log");
  const db = await readWorkspaceDB();
  const params = await searchParams;
  const q = queryValue(params,"q"), korisnik = queryValue(params,"korisnik"), funkcija = queryValue(params,"funkcija");
  const actors = [...new Set(db.audit.map(e => e.actor))].sort((a,b) => a.localeCompare(b,"hr"));
  const modules = FEATURE_CATALOG.filter(f => db.audit.some(e => e.feature === f.key));
  const filtered = [...db.audit].filter(e => matchesQuery(q,e.action,e.target,e.actor)).filter(e => !korisnik || e.actor === korisnik).filter(e => !funkcija || e.feature === funkcija).sort((a,b) => b.ts.localeCompare(a.ts));
  const paging = paginate(filtered,queryValue(params,"stranica"));
  return <>
    <PageHeader title="Zapisnik aktivnosti" subtitle="Radnje i promjene zabilježene u vašem uredu · vrijeme Europe/Zagreb"/>
    <div className="content">
      <form className="register-toolbar" method="get">
        <label className="search-field"><span className="sr-only">Pretraži aktivnosti</span><input type="search" name="q" defaultValue={q} placeholder="Radnja, predmet ili korisnik…"/></label>
        <label><span className="sr-only">Korisnik</span><select name="korisnik" defaultValue={korisnik}><option value="">Svi korisnici</option>{actors.map(actor => <option key={actor} value={actor}>{actor}</option>)}</select></label>
        <label><span className="sr-only">Funkcija</span><select name="funkcija" defaultValue={funkcija}><option value="">Sve funkcije</option>{modules.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}</select></label>
        <button type="submit" className="btn">Primijeni</button>
        {(q || korisnik || funkcija) && <Link className="btn btn-ghost" href="/zapisnik">Očisti filtre</Link>}
      </form>
      <section className="card">
        <div className="card-head"><h3>Aktivnosti ureda</h3><span className="t-sub">{filtered.length} zapisa</span></div>
        {!filtered.length ? <div className="empty"><h3>{db.audit.length ? "Nema odgovarajućih aktivnosti" : "Još nema zabilježenih aktivnosti"}</h3><p>{db.audit.length ? "Promijenite ili očistite filtre." : "Radnje vašeg ureda pojavit će se ovdje."}</p></div> : <>
          <div className="desktop-doc-register table-scroll"><table className="table"><thead><tr><th>Radnja i predmet</th><th>Korisnik</th><th>Funkcija</th><th className="right">Vrijeme</th></tr></thead><tbody>{paging.items.map(e => <tr key={e.id}><td><span className="t-title">{e.action}</span><div className="t-sub">{e.target}</div></td><td>{e.actor}</td><td className="t-sub">{FEATURE_CATALOG.find(f => f.key === e.feature)?.label ?? "Ured"}</td><td className="right t-sub"><time dateTime={e.ts}>{formatDateTime(e.ts)}</time></td></tr>)}</tbody></table></div>
          <div className="mobile-doc-list">{paging.items.map(e => <article className="mobile-doc-item" key={e.id}><h3 className="t-title">{e.action}</h3><p className="t-sub">{e.target}</p><div className="mobile-doc-meta"><span>{e.actor}</span><time dateTime={e.ts}>{formatDateTime(e.ts)}</time></div></article>)}</div>
        </>}
        <Pagination path="/zapisnik" filters={{q,korisnik,funkcija}} {...paging}/>
      </section>
    </div>
  </>;
}
