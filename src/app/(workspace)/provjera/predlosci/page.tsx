import Link from "next/link";
import { readWorkspaceDB as readDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { PageHeader } from "@/components/ui";
import { BUILT_IN_TEMPLATES } from "@/lib/review-templates";
import TemplateDeleteButton from "@/components/review/TemplateDeleteButton";
import { IPlus, IShield } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const session = await workspaceSession("contract_review");
  const db = await readDB();
  const custom = db.settings?.reviewTemplates ?? [];
  const admin = session.user.role === "firm_admin";
  const count = (n: number, one: string, few: string, many: string) => { const r = new Intl.PluralRules("hr-HR").select(n); return `${n} ${r === "one" ? one : r === "few" ? few : many}`; };
  return <>
    <PageHeader title="Predlošci provjere" subtitle="Teme, pitanja i kriteriji prema kojima se provjeravaju ugovori" crumbs={[{ href: "/provjera", label: "Provjera ugovora" }, { label: "Predlošci" }]}>
      {admin && <Link className="btn btn-primary btn-md" href="/provjera/predlosci/uredi"><IPlus aria-hidden="true" />Novi predložak</Link>}
    </PageHeader>
    <div className="content">
      <section className="playbook-section">
        <h2 className="upload-heading">Predlošci ureda</h2>
        {custom.length ? <div className="playbook-grid">{custom.map((t) => <article key={t.id} className="card card-pad playbook-card">
          <div className="playbook-top"><span className="playbook-icon" aria-hidden="true"><IShield /></span><div><h3>{t.name}</h3>{t.description && <p className="t-sub">{t.description}</p>}</div></div>
          <p className="t-sub">{count(t.topics.length, "tema", "teme", "tema")} · {count(t.topics.reduce((n, x) => n + x.criteria.length, 0), "kriterij", "kriterija", "kriterija")}{t.updatedAt ? ` · ažurirao ${t.createdBy ?? "ured"}` : ""}</p>
          <div className="playbook-foot">{admin ? <><Link className="link" href={`/provjera/predlosci/uredi?id=${t.id}`}>Uredi</Link><TemplateDeleteButton id={t.id} name={t.name} /></> : <Link className="link" href={`/provjera/predlosci/uredi?id=${t.id}`}>Pregledaj</Link>}</div>
        </article>)}</div> : <p className="t-sub">{admin ? "Još nema predložaka ureda. Napravite novi ili kopirajte predložak LTB Law i prilagodite ga standardima ureda." : "Ured još nema vlastitih predložaka."}</p>}
      </section>
      <section className="playbook-section">
        <h2 className="upload-heading">Predlošci LTB Law</h2>
        <div className="playbook-grid">{BUILT_IN_TEMPLATES.map((t) => <article key={t.id} className="card card-pad playbook-card">
          <div className="playbook-top"><span className="playbook-icon" aria-hidden="true"><IShield /></span><div><h3>{t.name}</h3><p className="t-sub">{t.description}</p></div></div>
          <p className="t-sub">{count(t.topics.length, "tema", "teme", "tema")}: {t.topics.map((x) => x.title).join(" · ")}</p>
          <div className="playbook-foot"><span className="t-sub">LTB Law</span>{admin ? <Link className="link" href={`/provjera/predlosci/uredi?izvor=${t.id}`}>Kopiraj i prilagodi</Link> : <Link className="link" href={`/provjera/predlosci/uredi?izvor=${t.id}`}>Pregledaj</Link>}</div>
        </article>)}</div>
      </section>
    </div>
  </>;
}
