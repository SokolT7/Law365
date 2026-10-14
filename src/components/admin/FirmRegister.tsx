"use client";

import Link from "next/link";
import { useState } from "react";
import type { FirmRecord } from "@/lib/platform";

const STATUS: Record<string, string> = { draft: "U pripremi", active: "Aktivan", suspended: "Suspendiran" };

export default function FirmRegister({ firms }: { firms: (FirmRecord & { userCount: number })[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const visible = firms.filter((firm) => (status === "all" || firm.status === status) && `${firm.name} ${firm.legalName}`.toLocaleLowerCase("hr-HR").includes(query.toLocaleLowerCase("hr-HR")));
  const pageSize = 15;
  const pages = Math.max(1, Math.ceil(visible.length / pageSize));
  return <section className="admin-panel">
    <div className="admin-register-toolbar"><label className="admin-field"><span className="sr-only">Pretraži urede</span><input type="search" placeholder="Pretraži naziv ureda…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(0); }} /></label><label className="admin-field"><span className="sr-only">Status ureda</span><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(0); }}><option value="all">Svi statusi</option><option value="draft">U pripremi</option><option value="active">Aktivni</option><option value="suspended">Suspendirani</option></select></label><span className="admin-result-count" aria-live="polite">{visible.length} ureda</span></div>
    {visible.length ? <><div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Ured</th><th>Status</th><th>Korisnici</th><th>Funkcije</th><th>Posljednja promjena</th><th><span className="sr-only">Otvori</span></th></tr></thead><tbody>{visible.slice(page * pageSize, (page + 1) * pageSize).map((firm) => <tr key={firm.id}><td><Link className="admin-firm-link" href={`/admin/firms/${firm.id}`}><span className="admin-firm-monogram" style={{ color: firm.accent }}>{firm.name.slice(0, 2).toLocaleUpperCase("hr-HR")}</span><span><strong>{firm.name}</strong><small>{firm.legalName}</small></span></Link></td><td><span className={`admin-status ${firm.status}`}>{STATUS[firm.status]}</span></td><td>{firm.userCount}</td><td>{firm.features.length}</td><td><time dateTime={firm.updatedAt}>{new Date(firm.updatedAt).toLocaleDateString("hr-HR", { timeZone: "Europe/Zagreb" })}</time></td><td><Link href={`/admin/firms/${firm.id}`} className="btn btn-sm" aria-label={`Uredi ${firm.name}`}>Uredi</Link></td></tr>)}</tbody></table></div>{pages > 1 && <div className="admin-pagination"><button className="btn btn-sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Prethodna</button><span>Stranica {page + 1} od {pages}</span><button className="btn btn-sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Sljedeća</button></div>}</> : <div className="admin-empty"><h3>{firms.length ? "Nema ureda za ovaj odabir." : "Još nema dodanih ureda."}</h3><p>{firms.length ? "Pokušajte s drugim nazivom ili statusom." : "Svaki ured dobiva vlastite korisnike, funkcije i identitet u zajedničkoj aplikaciji."}</p>{!firms.length && <Link className="btn btn-primary" href="/admin/firms/new">Dodaj prvi ured</Link>}</div>}
  </section>;
}
