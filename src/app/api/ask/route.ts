import { readJsonObject } from "@/lib/auth";
import { requireFeature, AccessError } from "@/lib/auth";
import { hasFeature } from "@/lib/features";
import { apiRoute } from "@/lib/api-access";
import { NextResponse } from "next/server";
import { readDB, writeDB, addAudit } from "@/lib/db";
import { answerQuestion } from "@/lib/ai/answer";
import { getMode } from "@/lib/ai/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handlePOST(req: Request) {
  const { question } = (await readJsonObject(req, 64_000)) as { question: string };
  if (typeof question !== "string" || question.length > 12000) throw new AccessError(400,"Provjerite pitanje (najviše 12.000 znakova).");
  if (!question || !question.trim()) {
    return NextResponse.json({ error: "Pitanje je prazno" }, { status: 400 });
  }

  const session = await requireFeature("legal_questions");
  const db = await readDB();
  const canReadDocuments = hasFeature(session.firm, "documents");
  const result = await answerQuestion(
    question,
    canReadDocuments ? db.chunks : [],
    canReadDocuments ? db.documents : [],
    getMode(),
    db.settings?.sources ?? { "vasi-dokumenti": true }
  );

  addAudit(db, "Postavio pravno pitanje", "Istraživanje izvora", "legal_questions");
  await writeDB(db, "legal_questions");

  return NextResponse.json(result);
}

export const POST = apiRoute("legal_questions", handlePOST);
