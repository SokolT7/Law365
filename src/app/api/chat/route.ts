import { readJsonObject } from "@/lib/auth";
import { AccessError } from "@/lib/auth";
import { apiRoute } from "@/lib/api-access";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readDB, writeDB, addAudit } from "@/lib/db";
import { chatAnswer } from "@/lib/ai/chat";
import { getMode } from "@/lib/ai/client";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handlePOST(req: Request) {
  const body = (await readJsonObject(req, 8*1024*1024)) as {
    documentId: string;
    message: string;
    image?: { mediaType: string; data: string };
  };
  const { documentId, message, image } = body;
  if (typeof documentId !== "string" || typeof message !== "string" || message.length > 12000) throw new AccessError(400,"Provjerite pitanje (najviše 12.000 znakova).");
  if (image && (typeof image.data !== "string" || image.data.length > 7*1024*1024 || !/^[A-Za-z0-9+/]*={0,2}$/.test(image.data) || !["image/png","image/jpeg","image/webp","image/gif"].includes(image.mediaType))) throw new AccessError(400,"Slika nije podržana ili je prevelika.");
  if (!message || !message.trim()) {
    return NextResponse.json({ error: "Poruka je prazna." }, { status: 400 });
  }

  const db = await readDB();
  const doc = db.documents.find((d) => d.id === documentId);
  if (!doc) return NextResponse.json({ error: "Dokument nije pronađen." }, { status: 404 });

  const docChunks = db.chunks.filter((c) => c.documentId === documentId);
  const history = doc.conversation ?? [];
  // izvori su autoritativni na poslužitelju (klijent ih ne može lažirati)
  const sources = db.settings?.sources ?? {};

  const result = await chatAnswer({
    question: message,
    history,
    chunks: docChunks,
    docs: db.documents,
    mode: getMode(),
    sources,
    image,
  });

  const now = new Date().toISOString();
  const userMsg: ChatMessage = {
    id: randomUUID(),
    role: "user",
    text: message,
    ts: now,
    hasImage: !!image,
  };
  const aiMsg: ChatMessage = {
    id: randomUUID(),
    role: "assistant",
    text: result.answer,
    ts: now,
    citations: result.citations,
  };
  doc.conversation = [...history, userMsg, aiMsg];
  addAudit(db, "Postavio pitanje u razgovoru", doc.title, "document_chat");
  await writeDB(db, "document_chat");

  return NextResponse.json({ answer: result.answer, citations: result.citations });
}

export const POST = apiRoute("document_chat", handlePOST);
