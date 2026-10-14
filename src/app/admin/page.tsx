import { IArrowRight } from "@/components/Icons";
import Link from "next/link";
import { listFirms, listUsers, listPlatformAudit } from "@/lib/platform";
import AuditList from "@/components/admin/AuditList";
import { requireAdminPage } from "@/components/admin/requireAdmin";

export default async function AdminPage() {
  await requireAdminPage();
  const firms = listFirms();
  const users = listUsers().filter((user) => user.role !== "platform_admin");
  const audit = listPlatformAudit(12);
  const drafts = firms.filter((firm) => firm.status === "draft");
  const metrics = [
    { label: "Aktivni uredi", value: firms.filter((firm) => firm.status === "active").length, detail: `${firms.length} ukupno` },
    { label: "Aktivni korisnici", value: users.filter((user) => user.status === "active").length, detail: "Pristup radnim prostorima" },
    { label: "Pozvani korisnici", value: users.filter((user) => user.status === "invited").length, detail: "Čeka se aktivacija računa" },
    { label: "Suspendirani uredi", value: firms.filter((firm) => firm.status === "suspended").length, detail: "Pristup privremeno obustavljen" },
  ];
  return <>
    <div className="admin-page-heading"><div><p className="eyebrow">Upravljanje pristupom</p><h1>Svaki ured. Jedno mjesto.</h1><p>Postavite radne prostore, upravljajte korisnicima i prilagodite dostupne funkcije.</p></div><Link className="btn btn-primary" href="/admin/firms/new">Dodaj ured <span aria-hidden="true">+</span></Link></div>
    <div className="admin-metrics">{metrics.map((metric) => <article className="admin-metric" key={metric.label}><span>{metric.label}</span><strong>{metric.value}</strong><small>{metric.detail}</small></article>)}</div>
    <div className="admin-overview-grid">
      <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">Priprema pristupa</p><h2>Uredi u pripremi</h2></div><Link href="/admin/firms" className="link">Svi uredi<IArrowRight aria-hidden="true" /></Link></div>{drafts.length ? <div className="admin-draft-list">{drafts.map((firm) => <Link key={firm.id} href={`/admin/firms/${firm.id}`}><span className="admin-firm-monogram" style={{ color: firm.accent }}>{firm.name.slice(0, 2).toLocaleUpperCase("hr-HR")}</span><div><strong>{firm.name}</strong><small>{listUsers(firm.id).length} korisnika · {firm.features.length} funkcija</small></div><span aria-hidden="true">→</span></Link>)}</div> : <div className="admin-empty"><h3>{firms.length ? "Svi uredi su obrađeni." : "Pripremite prvi ured."}</h3><p>Dodajte identitet ureda, odaberite funkcije i pozovite korisnike prije aktivacije.</p><Link className="btn" href="/admin/firms/new">Dodaj ured</Link></div>}</section>
      <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">Administrativni zapisnik</p><h2>Posljednje promjene</h2></div></div><AuditList entries={audit} /></section>
    </div>
  </>;
}
