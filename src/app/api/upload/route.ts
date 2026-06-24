import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readDB, writeDB, addAudit } from "@/lib/db";
import { parseFile, isSupported } from "@/lib/ingest/parse";
import { ingestContract } from "@/lib/ingest/pipeline";
import { getMode } from "@/lib/ai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function titleFromName(name: string): string {
  const base = name.replace(/\.(pdf|docx|txt|md)$/i, "").replace(/[-_]+/g, " ").trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datoteka nije priložena." }, { status: 400 });
  }
  if (!isSupported(file.name)) {
    return NextResponse.json(
      { error: "Nepodržan format. Koristite .pdf, .docx ili .txt." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text: string;
  try {
    text = await parseFile(file.name, buffer);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (!text || text.trim().length < 40) {
    return NextResponse.json(
      { error: "Dokument je prazan ili se nije mogao pročitati." },
      { status: 400 }
    );
  }

  const db = readDB();
  const mode = getMode();
  const title = titleFromName(file.name);

  const clientId = randomUUID();
  db.clients.push({ id: clientId, name: "Ručno učitani dokument", sector: "—" });
  const matterId = randomUUID();
  db.matters.push({
    id: matterId,
    clientId,
    title: `Ručno učitavanje — ${title}`,
    type: "Ručno učitavanje",
  });

  const out = await ingestContract({
    title,
    filename: file.name,
    text,
    clientId,
    matterId,
    mode,
  });

  db.documents.push(out.document);
  db.chunks.push(...out.chunks);
  db.keyTerms.push(...out.keyTerms);
  db.obligations.push(...out.obligations);
  db.findings.push(...out.findings);
  addAudit(db, "Učitao i analizirao dokument", out.document.title);
  writeDB(db);

  return NextResponse.json({ id: out.document.id });
}
