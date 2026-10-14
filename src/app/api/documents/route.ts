import { requireFeature, AccessError } from "@/lib/auth";
import { hasFeature } from "@/lib/features";
import { apiRoute, readUploadForm } from "@/lib/api-access";
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

async function handlePOST(req: Request) {
  const session = await requireFeature("documents");
  if (Number(req.headers.get("content-length") || 0) > 26 * 1024 * 1024) throw new AccessError(413,"Zahtjev je prevelik (najviše 25 MB).");
  const form = await readUploadForm(req);
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length > 10 || files.some(f => f.size > 10 * 1024 * 1024) || files.reduce((n,f)=>n+f.size,0) > 25*1024*1024) throw new AccessError(413,"Najviše 10 datoteka, 10 MB po datoteci i 25 MB ukupno.");
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

  // dodjela postojećem klijentu (iz obrasca) ili internom radnom prostoru
  const requestedClient = form.get("clientId");
  const existing =
    typeof requestedClient === "string" && requestedClient
      ? db.clients.find((c) => c.id === requestedClient)
      : undefined;
  if (requestedClient && (!hasFeature(session.firm, "clients") || !existing)) throw new AccessError(400,"Odabrani klijent nije dostupan.");
  let clientId: string;
  if (existing) {
    clientId = existing.id;
  } else {
    clientId = randomUUID();
    db.clients.push({ id: clientId, name: "Ručno učitani dokument", sector: "—" });
  }
  const kindField = form.get("kind");
  const kindLabel = kindField === "ugovor" ? "Ugovor" : "Dokument";
  const matterId = randomUUID();
  db.matters.push({ id: matterId, clientId, title: `Radni prostor — ${title}`, type: kindLabel });

  const greeting: ChatMessage = {
    id: randomUUID(),
    role: "assistant",
    text:
      names.length === 1
        ? `Učitao sam „${names[0]}”. Dokument je spreman za rad. Dostupne funkcije prikazane su u ovom radnom prostoru.`
        : `Učitao sam ${names.length} dokumenta. Dokumenti su spremni za rad. Dostupne funkcije prikazane su u ovom radnom prostoru.`,
    ts: now,
  };

  const doc: DocumentRec = {
    id: docId,
    title,
    filename: names[0],
    files: names,
    type: kindLabel,
    clientId,
    matterId,
    createdAt: now,
    analyses: [],
    conversation: [greeting],
  };
  db.documents.push(doc);
  addAudit(db, "Učitao dokument u radni prostor", title, "documents");
  await writeDB(db, "documents");

  return NextResponse.json({ id: docId });
}

export const POST = apiRoute("documents", handlePOST);
