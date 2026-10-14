"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisMode } from "@/lib/types";
export default function Poller({ documentId, mode }: {documentId:string;mode:AnalysisMode}) {
 const router=useRouter(); const [error,setError]=useState("");
 useEffect(()=>{
  let stopped=false; let timer:ReturnType<typeof setTimeout>; let attempts=0;
  const controller=new AbortController();
  async function poll(){
   try{const response=await fetch(`/api/documents/${documentId}`,{cache:"no-store",signal:controller.signal});
    if([401,403,404].includes(response.status)){if(!stopped)setError("Pristup obradi nije dostupan. Osvježite stranicu.");return;}
    if(!response.ok)throw new Error();const data=await response.json();const analysis=data.analyses?.find((a:{mode:string})=>a.mode===mode);
    if(!stopped&&analysis&&analysis.status!=="u_obradi"){router.refresh();return;}
   }catch{if(!stopped)setError("Provjera statusa privremeno nije dostupna. Pokušavamo ponovno.");}
   if(!stopped)timer=setTimeout(poll,Math.min(2000+attempts++*500,10000));
  }
  timer=setTimeout(poll,2000);return()=>{stopped=true;clearTimeout(timer);controller.abort();};
 },[documentId,mode,router]);
 return <div className="card card-pad empty"><div className="spinner"/><h3>Obrada dokumenta u tijeku</h3><p className="muted">Možete nastaviti s drugim zadacima. Rezultat će ostati spremljen u radnom prostoru.</p>{error&&<p role="status">{error}</p>}</div>;
}
