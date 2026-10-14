import { activeClientScope } from "@/lib/scope";
import ScopeNotice from "@/components/shell/ScopeNotice";
import Link from "next/link";
import { readWorkspaceDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { hasFeature } from "@/lib/features";
import { formatDate } from "@/lib/format";
import { PageHeader, DocStatusBadge, RelativeTime, EmptyState } from "@/components/ui";
import { UploadButton } from "@/components/shell/SearchTrigger";
import AskBar from "@/components/AskBar";
import DashboardDates from "@/components/DashboardDates";
import { collectDeadlines } from "@/lib/deadlines";
import { overallStatus, MODE_LABEL } from "@/lib/docs";
import { IAlert, ICalendar, ICheckCircle, IClock, IDocs, IFlag, IArrowRight } from "@/components/Icons";

export const dynamic = "force-dynamic";

type Attention = { key: string; tone: "hi" | "mid" | "info" | "ok"; Icon: typeof IDocs; title: string; sub: string; href: string; action: string };

function greeting(now: Date) {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/Zagreb" }).format(now));
  return hour < 12 ? "Dobro jutro" : hour < 18 ? "Dobar dan" : "Dobra večer";
}

function daysUntil(day: string) {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zagreb" }).format(new Date());
  return Math.round((Date.parse(day) - Date.parse(today)) / 86400000);
}

export default async function DashboardPage() {
  const { firm, user } = await workspaceSession();
  const db = await readWorkspaceDB();
  const scope = hasFeature(firm, "clients") ? await activeClientScope(db) : null;
  // Scoped view: this projection is never written back.
  if (scope) { db.documents = db.documents.filter((d) => d.clientId === scope.id); db.regUpdates = (db.regUpdates ?? []).filter((r) => r.affectedClientIds.includes(scope.id)); }
  const documents = hasFeature(firm, "documents");
  const regulations = hasFeature(firm, "regulatory_tracking");
  const now = new Date();

  const recent = [...db.documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  const processing = db.documents.filter((d) => d.analyses.some((a) => a.status === "u_obradi"));
  const complete = db.documents.filter((d) => d.analyses.some((a) => a.status === "analizirano")).length;
  const failed = db.documents.flatMap((d) => d.analyses.filter((a) => a.status === "greska").map((a) => ({ doc: d, analysis: a })));
  const deadlines = collectDeadlines(db.documents, now);
  const updates = (db.regUpdates ?? []).filter((r) => !r.reviewed).sort((a, b) => (a.severity === "visoka" ? 0 : 1) - (b.severity === "visoka" ? 0 : 1));

  // One prioritised list of what needs attention today.
  const attention: Attention[] = [
    ...failed.map(({ doc, analysis }) => ({ key: `f-${doc.id}-${analysis.mode}`, tone: "hi" as const, Icon: IAlert, title: "Obrada nije uspjela", sub: `${doc.title} · ${MODE_LABEL[analysis.mode]}`, href: `/dokumenti/${doc.id}?analiza=${analysis.mode}`, action: "Pokušaj ponovno" })),
    ...(documents ? deadlines.upcoming.filter((d) => daysUntil(d.date) <= 14).map((d) => {
      const days = daysUntil(d.date);
      return { key: `d-${d.key}`, tone: days <= 3 ? "hi" as const : "mid" as const, Icon: ICalendar, title: days === 0 ? "Rok je danas" : days === 1 ? "Rok je sutra" : `Rok za ${days} dana · ${formatDate(d.date)}`, sub: `${d.title} — ${d.description}`, href: `/dokumenti/${d.documentId}`, action: "Otvori" };
    }) : []),
    ...(regulations ? updates.slice(0, 4).map((r) => ({ key: `r-${r.id}`, tone: r.severity === "visoka" ? "hi" as const : "mid" as const, Icon: IFlag, title: r.title, sub: `Promjena propisa · ${r.source}`, href: "/propisi?prikaz=novo", action: "Pregledaj" })) : []),
    ...processing.slice(0, 3).map((d) => ({ key: `p-${d.id}`, tone: "info" as const, Icon: IClock, title: "Analiza u obradi", sub: d.title, href: `/dokumenti/${d.id}`, action: "Prati" })),
  ].slice(0, 7);

  const first = user.name.split(" ")[0];
  return <>
    <PageHeader title="Pregled ureda" subtitle={new Intl.DateTimeFormat("hr-HR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zagreb" }).format(now)}>
      {documents && <UploadButton />}
    </PageHeader>
    <div className="content">
      <ScopeNotice scope={scope} />
      <section className="greeting" aria-label="Dobrodošlica">
        <div><h2>{greeting(now)}, {first}.</h2><p>{firm.greeting || (attention.length ? `${attention.length} ${attention.length === 1 ? "stavka čeka" : "stavke čekaju"} vašu pažnju.` : "Sve je pregledano.")}</p></div>
      </section>

      {hasFeature(firm, "legal_questions") && <AskBar documentCount={db.documents.length} />}

      {(documents || regulations) && <div className="summary-strip">
        {documents && <>
          <Link className="summary-item" href="/dokumenti"><span><IDocs size={14} aria-hidden="true" />Dokumenti</span><b>{db.documents.length}</b></Link>
          <Link className="summary-item" href="/dokumenti?status=analizirano"><span><ICheckCircle size={14} aria-hidden="true" />Spremno za pregled</span><b>{complete}</b></Link>
          <Link className="summary-item" href="/dokumenti?status=u_obradi"><span><IClock size={14} aria-hidden="true" />U obradi</span><b>{processing.length}</b></Link>
        </>}
        {regulations && <Link className="summary-item" href="/propisi?prikaz=novo"><span><IFlag size={14} aria-hidden="true" />Promjene propisa</span><b className={updates.some((u) => u.severity === "visoka") ? "alert" : undefined}>{updates.length}</b></Link>}
      </div>}

      {(documents || regulations) && <div className="split-330">
        <div className="col-stack">
          <section className="card" aria-labelledby="attention-title">
            <div className="card-head"><div><h3 id="attention-title">Za vas danas</h3><p className="t-sub">Rokovi, neuspjele obrade i promjene propisa</p></div></div>
            {attention.length ? <ul className="attention-list">{attention.map((item) => <li key={item.key}>
              <Link className="attention-row" href={item.href}>
                <span className={`attention-icon ${item.tone}`} aria-hidden="true"><item.Icon /></span>
                <span className="attention-main"><span className="t-title">{item.title}</span><span className="t-sub">{item.sub}</span></span>
                <span className="link">{item.action}<IArrowRight aria-hidden="true" /></span>
              </Link>
            </li>)}</ul> : <div className="attention-empty"><ICheckCircle aria-hidden="true" />Sve je pregledano. Nema rokova ni promjena koje čekaju.</div>}
          </section>

          {documents && <section className="card" aria-labelledby="recent-title">
            <div className="card-head"><div><h3 id="recent-title">Nastavite</h3><p className="t-sub">Nedavno učitani dokumenti</p></div><Link href="/dokumenti">Svi dokumenti<IArrowRight aria-hidden="true" /></Link></div>
            {recent.length ? <><div className="table-scroll desktop-doc-register"><table className="table"><thead><tr><th>Dokument</th><th>Status</th><th className="right">Dodano</th></tr></thead><tbody>
              {recent.map((d) => <tr key={d.id} className="row-link">
                <td><Link className="t-title" href={`/dokumenti/${d.id}`}>{d.title}</Link><div className="t-sub">{d.type}</div></td>
                <td>{d.analyses.length ? <DocStatusBadge status={overallStatus(d)} /> : <span className="badge neutral">Učitano</span>}</td>
                <td className="right t-sub mono"><RelativeTime iso={d.createdAt} /></td>
              </tr>)}
            </tbody></table></div>
            <div className="mobile-doc-list">{recent.map((d) => <Link key={d.id} className="mobile-doc-item" href={`/dokumenti/${d.id}`}><span className="t-title">{d.title}</span><span className="mobile-doc-meta">{d.analyses.length ? <DocStatusBadge status={overallStatus(d)} /> : <span className="badge neutral">Učitano</span>}<span className="t-sub"><RelativeTime iso={d.createdAt} /></span></span></Link>)}</div></> : <EmptyState icon={<IDocs />} title="Još nema dokumenata" action={<UploadButton>Učitaj prvi dokument</UploadButton>}>Učitajte ugovor ili dokument i započnite rad.</EmptyState>}
          </section>}
        </div>
        {documents && <DashboardDates {...deadlines} />}
      </div>}

      {!documents && !regulations && <div className="card"><EmptyState title="Vaš ured je spreman">Odaberite dostupnu funkciju iz izbornika. Za promjenu pristupa obratite se LTB administratoru.</EmptyState></div>}
    </div>
  </>;
}
