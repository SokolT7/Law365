import { NextResponse } from "next/server";
import { apiRoute } from "@/lib/api-access";
import { readDB } from "@/lib/db";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const GET = apiRoute("documents", async (req:Request,{params}:{params:Promise<{id:string}>})=>{
  const {id}=await params;
  const chunkId=new URL(req.url).searchParams.get("chunk");
  const db=await readDB();
  const doc=db.documents.find(d=>d.id===id);
  const chunk=db.chunks.find(c=>c.id===chunkId && c.documentId===id);
  if(!doc || !chunk) return NextResponse.json({error:"Izvor nije pronađen."},{status:404});
  return NextResponse.json({documentTitle:doc.title,heading:chunk.heading,text:chunk.text});
});
