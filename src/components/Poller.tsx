"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisMode } from "@/lib/types";
import { useToast } from "@/components/Feedback";
import { MODE_LABEL } from "@/lib/docs";
export default function Poller({ documentId, mode }: {documentId:string;mode:AnalysisMode}) {
 const router=useRouter(); const toast=useToast(); const [error,setError]=useState("");
 useEffect(()=>{
  let stopped=false; let timer:ReturnType<typeof setTimeout>; let attempts=0;
  const controller=new AbortController();
  async function poll(){
   try{const response=await fetch(`/api/documents/${documentId}`,{cache:"no-store",signal:controller.signal});
    if([401,403,404].includes(response.status)){if(!stopped)setError("Pristup obradi nije dostupan. Osvježite stranicu.");return;}
    if(!response.ok)throw new Error();const data=await response.json();const analysis=data.analyses?.find((a:{mode:string})=>a.mode===mode);
    if(!stopped&&analysis&&analysis.status!=="u_obradi"){toast(analysis.status==="greska"?{tone:"error",message:`Obrada nije uspjela: ${MODE_LABEL[mode]}.`}:{message:`Spremno: ${MODE_LABEL[mode]}.`});window.dispatchEvent(new Event("ltb:notifications-refresh"));router.refresh();return;}
   }catch{if(!stopped)setError("Provjera statusa privremeno nije dostupna. Pokušavamo ponovno.");}
   if(!stopped)timer=setTimeout(poll,Math.min(2000+attempts++*500,10000));
  }
  timer=setTimeout(poll,2000);return()=>{stopped=true;clearTimeout(timer);controller.abort();};
 },[documentId,mode,router,toast]);
 return <div className="card analysis-pending" role="status">
  <h3>{MODE_LABEL[mode]} u izradi</h3>
  <p>Obično traje jednu do dvije minute. Možete nastaviti raditi — obavijestit ćemo vas kad bude spremno.</p>
  <div className="progress indeterminate"><span /></div>
  <div className="section-gap" aria-hidden="true"><span className="skeleton skeleton-line" style={{width:"92%"}}/><span className="skeleton skeleton-line" style={{width:"78%"}}/><span className="skeleton skeleton-line" style={{width:"85%"}}/><span className="skeleton skeleton-line" style={{width:"60%"}}/></div>
  {error&&<p className="t-sub section-gap">{error}</p>}
 </div>;
}
