"use client";
import Link from "next/link";
import { useState } from "react";
import { formatDate } from "@/lib/format";
import type { collectDeadlines } from "@/lib/deadlines";
export default function DashboardDates({ upcoming, past }: ReturnType<typeof collectDeadlines>) {
  const [view, setView] = useState<"upcoming" | "past">("upcoming");
  const [limit, setLimit] = useState(4);
  const dates = view === "past" ? past : upcoming;
  return <section className="card" id="rokovi">
    <div className="card-head"><h3>Datumi i rokovi</h3><span className="t-sub">Europe/Zagreb</span></div>
    <div className="date-switch" role="group" aria-label="Prikaz datuma">
      <button aria-pressed={view==="upcoming"} onClick={()=>{setView("upcoming");setLimit(4);}}>Nadolazeći <span>{upcoming.length}</span></button>
      <button aria-pressed={view==="past"} onClick={()=>{setView("past");setLimit(4);}}>Prošli <span>{past.length}</span></button>
    </div>
    <div className="card-pad">
      {view === "past" && <p className="date-notice">Datumi su prošli. Otvorite dokument i provjerite je li obveza izvršena; status izvršenja se ne prati.</p>}
      {dates.length ? dates.slice(0,limit).map(d=><div className="deadline-row" key={d.key}>
        <div className="flex between"><time className="workspace-kicker" dateTime={d.date}>{formatDate(d.date)}</time>{d.today && <span className="badge srednja">Danas</span>}</div>
        <Link className="t-title" href={`/dokumenti/${d.documentId}`}>{d.title}</Link><p className="t-sub">{d.description}</p>
      </div>) : <div className="empty"><p>{view === "past" ? "Nema izdvojenih prošlih datuma." : "Nema izdvojenih nadolazećih datuma."}</p><span className="t-sub">Datumi iz dovršenih analiza pojavit će se ovdje.</span></div>}
      {dates.length > limit && <button className="btn btn-ghost" onClick={()=>setLimit(limit+6)}>Prikaži još ({dates.length-limit})</button>}
    </div>
  </section>;
}
