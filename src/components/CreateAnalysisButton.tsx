"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisMode } from "@/lib/types";
export default function CreateAnalysisButton({ documentId, mode, label, variant = "tab" }: { documentId:string; mode:AnalysisMode; label:string; variant?:"tab"|"action" }) {
  const router=useRouter(); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  async function create() {
    if(busy) return; setBusy(true); setError("");
    try { const res=await fetch(`/api/documents/${documentId}`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode})}); const data=await res.json(); if(!res.ok) throw new Error(data.error || "Obrada nije pokrenuta."); router.push(`/dokumenti/${documentId}?analiza=${mode}`);router.refresh(); }
    catch(e){setError(e instanceof Error?e.message:"Obrada nije pokrenuta.");} finally{setBusy(false);}
  }
  return <div><button className={variant==="action"?"action-card action-create":"tab tab-add"} onClick={create} disabled={busy}>{variant==="action"?<><span className="ac-plus">＋</span><span className="ac-main"><span className="ac-title">{label}</span><span className="ac-sub">{busy?"Pokrećem…":"Pokreni obradu"}</span></span></>:busy?"Pokrećem…":`Izradi ${label}`}</button>{error&&<p className="flash err" role="alert">{error}</p>}</div>;
}
