import { AccessError, readJsonObject, requireFeature } from "@/lib/auth";
import { hasFeature } from "@/lib/features";
import { apiRoute } from "@/lib/api-access";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readDB, writeDB, addAudit } from "@/lib/db";
import { chunkContract } from "@/lib/ingest/chunk";
import { draftKind } from "@/lib/drafting/kinds";
import type { ChatMessage, DocumentRec } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Saves a finished AI draft as an ordinary document, so it can be chatted with, analysed and reviewed. */
async function handlePOST(req: Request) {
  const session = await requireFeature("documents");
  const body = await readJsonObject(req, 400_000);
  const kind = draftKind(body.kind);
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!kind || !title || title.length > 200) throw new AccessError(400, "Upišite naziv dokumenta (najviše 200 znakova).");
  if (text.length < 40 || text.length > 200_000) throw new AccessError(400, "Nacrt je prazan ili predug.");

  const db = await readDB();
  const requestedClient = typeof body.clientId === "string" && body.clientId ? body.clientId : undefined;
  const existing = requestedClient ? db.clients.find((c) => c.id === requestedClient) : undefined;
  if (requestedClient && (!hasFeature(session.firm, "clients") || !existing)) throw new AccessError(400, "Odabrani klijent nije dostupan.");
  let clientId: string;
  if (existing) {
    clientId = existing.id;
  } else {
    clientId = randomUUID();
    db.clients.push({ id: clientId, name: "Ručno učitani dokument", sector: "—" });
  }

  const docId = randomUUID();
  const now = new Date().toISOString();
  const filename = `${title}.docx`;
  db.chunks.push(...chunkContract(text).map((c, index) => ({ id: randomUUID(), documentId: docId, index, heading: c.heading, text: c.text })));
  const matterId = randomUUID();
  db.matters.push({ id: matterId, clientId, title: `Radni prostor — ${title}`, type: kind.docType });

  const greeting: ChatMessage = {
    id: randomUUID(),
    role: "assistant",
    text: `Nacrt „${title}” je spremljen. Ovdje ga možete pregledati, postavljati pitanja ili provjeriti rizike.`,
    ts: now,
  };
  const doc: DocumentRec = {
    id: docId, title, filename, files: [filename], type: kind.docType, clientId, matterId,
    createdAt: now, analyses: [], conversation: [greeting],
  };
  db.documents.push(doc);
  addAudit(db, "Sastavio dokument uz AI", title, "documents");
  await writeDB(db, "documents");

  return NextResponse.json({ id: docId });
}

export const POST = apiRoute("documents", handlePOST);
