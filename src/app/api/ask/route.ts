import { NextResponse } from "next/server";
import { readDB, writeDB, addAudit } from "@/lib/db";
import { answerQuestion } from "@/lib/ai/answer";
import { getMode } from "@/lib/ai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { question } = (await req.json()) as { question: string };
  if (!question || !question.trim()) {
    return NextResponse.json({ error: "Pitanje je prazno" }, { status: 400 });
  }

  const db = readDB();
  const result = await answerQuestion(question, db.chunks, db.documents, getMode());

  addAudit(db, "Postavio pitanje (AI)", question.slice(0, 90));
  writeDB(db);

  return NextResponse.json(result);
}
