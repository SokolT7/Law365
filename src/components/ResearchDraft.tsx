"use client";
import { createContext, useContext, useState } from "react";
import { useRouter } from "next/navigation";
const Context=createContext<{draft:string;setDraft:(value:string)=>void}|null>(null);
export function ResearchDraftProvider({children}:{children:React.ReactNode}) {
  const [draft,setDraft]=useState("");
  return <Context.Provider value={{draft,setDraft}}>{children}</Context.Provider>;
}
export function useResearchDraft() {const context=useContext(Context);if(!context)throw new Error("Research draft requires workspace context.");return context;}
export function ResearchEntry({documentCount}:{documentCount:number}) {
  const {draft,setDraft}=useResearchDraft();const router=useRouter();
  return <section className="research-entry"><div className="research-entry-heading"><div><span className="workspace-kicker">PRAVNO ISTRAŽIVANJE</span><h2>Od pitanja do izvora.</h2><p>Razjasnite odredbu, pronađite obvezu ili usporedite dostupne dokumente.</p></div><span className="badge neutral">{documentCount} dokumenata ureda</span></div>
    <form onSubmit={event=>{event.preventDefault();router.push("/pitanja");}}><label className="sr-only" htmlFor="research-entry-question">Pitanje za istraživanje</label><input id="research-entry-question" maxLength={12000} value={draft} onChange={event=>setDraft(event.target.value)} placeholder="Što želite istražiti?"/><button className="btn btn-primary" type="submit">Otvori istraživanje ↗</button></form>
    <p className="research-entry-note">Pitanje se prenosi u radni prostor; obradu pokrećete kada ste spremni.</p>
  </section>;
}
