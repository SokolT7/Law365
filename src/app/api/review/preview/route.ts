import { NextResponse } from "next/server";
import { AccessError, readJsonObject, requireFeature } from "@/lib/auth";
import { apiRoute } from "@/lib/api-access";
import { readDB } from "@/lib/db";
import { evaluateTemplate, sanitizeTemplate } from "@/lib/review-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Runs an unsaved template against one of the firm's documents so admins can tune keywords. */
export const POST = apiRoute("contract_review", async (req: Request) => {
  const session = await requireFeature("contract_review");
  const body = (await readJsonObject(req, 200_000)) as { template?: unknown; documentId?: unknown };
  const db = await readDB();
  const doc = db.documents.find((d) => d.id === body.documentId);
  if (!doc) throw new AccessError(404, "Dokument nije pronađen.");
  const template = sanitizeTemplate(body.template, "pregled", session.user.name);
  if (typeof template === "string") throw new AccessError(400, template);
  const results = evaluateTemplate(template, db.chunks.filter((c) => c.documentId === doc.id));
  return NextResponse.json({ results: results.map((r) => ({ id: r.topic.id, title: r.topic.title, status: r.status, criteria: r.criteria.map((c) => ({ label: c.label, found: c.found, quote: c.quote })) })) });
});
