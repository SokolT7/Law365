import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readDB, writeDB, addAudit } from "@/lib/db";
import { chatAnswer } from "@/lib/ai/chat";
import { getMode } from "@/lib/ai/client";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    documentId: string;
    message: string;
    image?: { mediaType: string; data: string };
  };
  const { documentId, message, image } = body;
  if (!message || !message.trim()) {
    return NextResponse.json({ error: "Poruka je prazna." }, { status: 400 });
  }

  const db = await readDB();
  const doc = db.documents.find((d) => d.id === documentId);
  if (!doc) return NextResponse.json({ error: "Dokument nije pronađen." }, { status: 404 });

  const docChunks = db.chunks.filter((c) => c.documentId === documentId);
  const history = doc.conversation ?? [];

  const result = await chatAnswer({
    question: message,
    history,
    chunks: docChunks,
    docs: db.documents,
    mode: getMode(),
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
  addAudit(db, "Postavio pitanje u razgovoru", message.slice(0, 80));
  await writeDB(db);

  return NextResponse.json({ answer: result.answer, citations: result.citations });
}
