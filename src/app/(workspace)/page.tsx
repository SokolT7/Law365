import { ResearchEntry } from "@/components/ResearchDraft";
import Link from "next/link";
import { readWorkspaceDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { hasFeature } from "@/lib/features";
import { formatDate } from "@/lib/format";
import { PageHeader, DocStatusBadge } from "@/components/ui";
import DashboardDates from "@/components/DashboardDates";
import { collectDeadlines } from "@/lib/deadlines";
import { overallStatus } from "@/lib/docs";
import { IDocs, IClock, IShield, IFlag } from "@/components/Icons";

export const dynamic = "force-dynamic";
export default async function DashboardPage() {
  const { firm, user } = await workspaceSession();
  const db = await readWorkspaceDB();
  const documents = hasFeature(firm,"documents");
  const regulations = hasFeature(firm,"regulatory_tracking");
  const recent = [...db.documents].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,6);
  const processing = db.documents.filter(d=>d.analyses.some(a=>a.status==="u_obradi")).length;
  const complete = db.documents.filter(d=>d.analyses.some(a=>a.status==="analizirano")).length;
  const deadlines = collectDeadlines(db.documents);
  const updates = (db.regUpdates ?? []).filter(r=>!r.reviewed);
  return <>
    <PageHeader title="Pregled ureda" subtitle="Vaš radni dan, na jednom mjestu.">
      <span className="workspace-date">{new Intl.DateTimeFormat("hr-HR",{day:"numeric",month:"long",year:"numeric",timeZone:"Europe/Zagreb"}).format(new Date())}</span>
    </PageHeader>
    <div className="content">
      <section className="workspace-intro">
        <div><p className="workspace-kicker">RADNI PROSTOR · {firm.name}</p><h2 className="workspace-title">Dobro došli, {user.name.split(" ")[0]}.</h2><p className="workspace-description">{firm.greeting || "Jasan pregled. Promišljene odluke. Više prostora za vaš posao."}</p></div>
        {documents && <Link className="btn btn-primary" href="/dokumenti#upload"><IDocs size={16}/> Učitaj dokument <span aria-hidden>↗</span></Link>}
      </section>
      {hasFeature(firm,"legal_questions") && <ResearchEntry documentCount={db.documents.length}/>}
      <div className="grid grid-4" style={{marginBottom:28}}>
        {documents && <><Link className="stat" href="/dokumenti"><div className="flex between"><span className="label">Dokumenti ureda</span><IDocs size={18}/></div><div className="value">{db.documents.length.toString().padStart(2,"0")}</div><div className="foot">Svi dokumenti i ugovori</div></Link>
        <Link className="stat" href="/dokumenti?status=analizirano"><div className="flex between"><span className="label">Spremno za pregled</span><IShield size={18}/></div><div className="value">{complete.toString().padStart(2,"0")}</div><div className="foot">Dovršene analize</div></Link>
        <Link className="stat" href="/dokumenti?status=u_obradi"><div className="flex between"><span className="label">U obradi</span><IClock size={18}/></div><div className="value">{processing.toString().padStart(2,"0")}</div><div className="foot">Aktivne obrade dokumenata</div></Link></>}
        {regulations && <Link className="stat" href="/propisi"><div className="flex between"><span className="label">Promjene propisa</span><IFlag size={18}/></div><div className="value">{updates.length.toString().padStart(2,"0")}</div><div className="foot">Čeka vaš pregled</div></Link>}
      </div>
      {documents && <div className="split-330">
        <section className="card"><div className="card-head"><div><h3>Nedavni dokumenti</h3><p className="t-sub">Nastavite ondje gdje ste stali.</p></div><Link className="t-title" href="/dokumenti">Svi dokumenti →</Link></div>
          {recent.length ? <div className="table-scroll"><table className="table"><thead><tr><th>Dokument</th><th>Status</th><th className="right">Dodano</th></tr></thead><tbody>{recent.map(d=><tr key={d.id}><td><Link className="t-title" href={`/dokumenti/${d.id}`}>{d.title}</Link><div className="t-sub">{d.type}</div></td><td>{d.analyses.length ? <DocStatusBadge status={overallStatus(d)}/> : <span className="badge neutral">Učitano</span>}</td><td className="right mono t-sub">{formatDate(d.createdAt)}</td></tr>)}</tbody></table></div>:<div className="empty"><IDocs size={30}/><h3>Prostor za vaš prvi dokument</h3><p>Učitajte ugovor ili dokument i započnite rad u uredu.</p><Link className="btn" href="/dokumenti#upload">Učitaj dokument →</Link></div>}
        </section>
        <DashboardDates {...deadlines}/>
      </div>}
      {regulations && <section className="card" style={{marginTop:24}}><div className="card-head"><h3>Za vaš pregled</h3><Link className="t-title" href="/propisi">Praćenje propisa →</Link></div><div className="card-pad">{updates.length ? updates.slice(0,3).map(r=><div className="deadline-row" key={r.id}><span className={`badge ${r.severity}`}>{r.severity}</span> <Link className="t-title" href="/propisi">{r.title}</Link><p className="t-sub">{r.source} · {formatDate(r.date)}</p></div>):<p className="muted">Nema novih regulatornih promjena za pregled.</p>}</div></section>}
      {!documents && !regulations && <div className="card card-pad"><h3>Vaš ured je spreman.</h3><p className="muted">Odaberite dostupnu funkciju iz izbornika. Za promjenu pristupa obratite se LTB administratoru.</p></div>}
      <p className="workspace-footnote">LTB Law · Privatni radni prostor vašeg ureda</p>
    </div>
  </>;
}
