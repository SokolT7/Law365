import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readDB, writeDB, addAudit } from "@/lib/db";
import { parseFile, isSupported } from "@/lib/ingest/parse";
import { chunkContract } from "@/lib/ingest/chunk";
import type { Chunk, ChatMessage, DocumentRec } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function titleFromName(name: string): string {
  const base = name.replace(/\.(pdf|docx|txt|md)$/i, "").replace(/[-_]+/g, " ").trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Datoteka nije priložena." }, { status: 400 });
  }
  for (const f of files) {
    if (!isSupported(f.name)) {
      return NextResponse.json(
        { error: `Nepodržan format: ${f.name}. Koristite .pdf, .docx ili .txt.` },
        { status: 400 }
      );
    }
  }

  const db = await readDB();
  const docId = randomUUID();
  const now = new Date().toISOString();
  const chunks: Chunk[] = [];
  const names: string[] = [];

  for (const file of files) {
    const buffer = Buffer.from(await file.arrayBuffer());
    let text: string;
    try {
      text = await parseFile(file.name, buffer);
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 400 });
    }
    if (!text || text.trim().length < 40) continue;
    names.push(file.name);
    chunkContract(text).forEach((c, i) =>
      chunks.push({
        id: randomUUID(),
        documentId: docId,
        index: chunks.length + i,
        heading: `${file.name} · ${c.heading}`,
        text: c.text,
      })
    );
  }
  if (names.length === 0) {
    return NextResponse.json({ error: "Dokumenti su prazni ili nečitljivi." }, { status: 400 });
  }
  db.chunks.push(...chunks);

  const title =
    names.length === 1 ? titleFromName(names[0]) : `Radni prostor (${names.length} dokumenata)`;

  const clientId = randomUUID();
  db.clients.push({ id: clientId, name: "Ručno učitani dokument", sector: "—" });
  const matterId = randomUUID();
  db.matters.push({ id: matterId, clientId, title: `Radni prostor — ${title}`, type: "Dokument" });

  const greeting: ChatMessage = {
    id: randomUUID(),
    role: "assistant",
    text:
      names.length === 1
        ? `Učitao sam „${names[0]}”. Pitajte me bilo što o dokumentu, ili gore pokrenite Sažetak ili Detaljnu analizu.`
        : `Učitao sam ${names.length} dokumenta. Pitajte me o njima, ili gore pokrenite Sažetak ili Detaljnu analizu.`,
    ts: now,
  };

  const doc: DocumentRec = {
    id: docId,
    title,
    filename: names[0],
    files: names,
    type: "Dokument",
    clientId,
    matterId,
    createdAt: now,
    analyses: [],
    conversation: [greeting],
  };
  db.documents.push(doc);
  addAudit(db, "Učitao dokument u radni prostor", title);
  await writeDB(db);

  return NextResponse.json({ id: docId });
}
