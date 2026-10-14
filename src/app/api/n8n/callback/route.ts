import { NextResponse } from "next/server";
import { readJobDB, writeDB, addAudit } from "@/lib/db";
import { apiError } from "@/lib/auth";
import { getJob, completeJob } from "@/lib/platform";
import { verifySecret } from "@/lib/n8n";
import { validExtraction } from "@/lib/validate-extraction";
import { MODE_LABEL } from "@/lib/docs";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req:Request){
 if(!verifySecret(req))return NextResponse.json({error:"Pristup nije dopušten."},{status:401});
 try{
  const text=await req.text();if(Buffer.byteLength(text)>2*1024*1024)return NextResponse.json({error:"Rezultat je prevelik."},{status:413});
  const body=JSON.parse(text);
  if(!body || typeof body!=="object" || body.v!==1 || typeof body.jobId!=="string" || typeof body.documentId!=="string" || !["ok","error"].includes(body.status) || (body.status==="ok"&&!validExtraction(body.result)))return NextResponse.json({error:"Neispravan rezultat."},{status:400});
  const job=getJob(body.jobId);if(!job || job.documentId!==body.documentId)return NextResponse.json({error:"Obrada nije pronađena."},{status:404});
  if(job.status!=="pending")return NextResponse.json({ok:true});
  const db=readJobDB(job.firmId);const doc=db.documents.find(d=>d.id===job.documentId);const analysis=doc?.analyses.find(a=>a.jobId===job.id&&a.mode===job.mode);
  if(!doc||!analysis)return NextResponse.json({error:"Obrada nije pronađena."},{status:404});
  if(analysis.status!=="u_obradi"){completeJob(job.id,analysis.status==="analizirano"?"complete":"failed");return NextResponse.json({ok:true});}
  if(body.status==="ok"){
   analysis.result=body.result;analysis.status="analizirano";analysis.error=undefined;
   // Keep the upload's classification separate from a disabled analysis module.
   addAudit(db,`Zaprimljen rezultat (${MODE_LABEL[analysis.mode]})`,doc.title, analysis.mode === "sazetak" ? "summary_analysis" : "detailed_analysis");
  }else{analysis.status="greska";analysis.error="Obrada nije uspjela. Pokušajte ponovno.";addAudit(db,`Greška u obradi (${MODE_LABEL[analysis.mode]})`,doc.title, analysis.mode === "sazetak" ? "summary_analysis" : "detailed_analysis");}
  await writeDB(db);completeJob(job.id,body.status==="ok"?"complete":"failed");
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
 }catch(error){if(error instanceof SyntaxError)return NextResponse.json({error:"Neispravan JSON."},{status:400});return apiError(error);}
}
