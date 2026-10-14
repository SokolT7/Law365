import { IArrowLeft } from "@/components/Icons";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFirm, listUsers, listPlatformAudit } from "@/lib/platform";
import FirmEditor from "@/components/admin/FirmEditor";
import UserManager from "@/components/admin/UserManager";
import AuditList from "@/components/admin/AuditList";
import { requireAdminPage } from "@/components/admin/requireAdmin";

const STATUS: Record<string, string> = { draft: "U pripremi", active: "Aktivan", suspended: "Suspendiran" };

export default async function FirmDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ created?: string }> }) {
  await requireAdminPage();
  const { id } = await params;
  const { created } = await searchParams;
  const firm = getFirm(id);
  if (!firm) notFound();
  const users = listUsers(id);
  const userIds = new Set(users.map((user) => user.id));
  const audit = listPlatformAudit(100).filter((entry) => entry.targetId === id || userIds.has(entry.targetId)).slice(0, 12);
  return <><Link href="/admin/firms" className="admin-back-link"><IArrowLeft size={14} aria-hidden="true" />Svi uredi</Link><div className="admin-page-heading"><div><p className="eyebrow">Postavke radnog prostora</p><h1>{firm.name}</h1><p>{firm.legalName}</p></div><span className={`admin-status ${firm.status}`}>{STATUS[firm.status]}</span></div>{created === "1" && <div className="admin-notice success" role="status">Ured je spremljen u pripremi. Dodajte korisnike, provjerite konfiguraciju i zatim promijenite status u „Aktivan”.</div>}<nav className="admin-section-links" aria-label="Odjeljci ureda"><a href="#konfiguracija">Identitet i funkcije</a><a href="#korisnici">Korisnici ({users.length})</a><a href="#aktivnosti">Aktivnosti</a></nav><div id="konfiguracija"><FirmEditor firm={firm} /></div><UserManager firmId={id} users={users} /><section className="admin-panel" id="aktivnosti"><div className="admin-section-heading"><div><p className="eyebrow">Administrativni zapisnik</p><h2>Promjene ovog ureda</h2></div></div><AuditList entries={audit} /></section><p className="admin-record-meta">Kreirano {new Date(firm.createdAt).toLocaleString("hr-HR", { timeZone: "Europe/Zagreb" })} · Posljednja promjena {new Date(firm.updatedAt).toLocaleString("hr-HR", { timeZone: "Europe/Zagreb" })} (Zagreb)</p></>;
}
