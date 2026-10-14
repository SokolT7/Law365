import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { AccessError, readJsonObject, requireFeature } from "@/lib/auth";
import { apiRoute } from "@/lib/api-access";
import { addAudit, readDB, writeDB } from "@/lib/db";
import { allTemplates, sanitizeTemplate } from "@/lib/review-templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_TEMPLATES = 40;

export const GET = apiRoute("contract_review", async () => {
  const db = await readDB();
  return NextResponse.json({ templates: allTemplates(db.settings?.reviewTemplates) });
});

/** Create (no id) or update (id) a firm template. Firm admins only. */
export const POST = apiRoute("contract_review", async (req: Request) => {
  const session = await requireFeature("contract_review");
  if (session.user.role !== "firm_admin") throw new AccessError(403, "Predloške uređuje administrator ureda.");
  const body = (await readJsonObject(req, 200_000)) as Record<string, unknown>;
  const db = await readDB();
  const existing = db.settings?.reviewTemplates ?? [];
  const id = typeof body.id === "string" && existing.some((t) => t.id === body.id) ? body.id : `ured-${randomUUID().slice(0, 8)}`;
  if (!existing.some((t) => t.id === id) && existing.length >= MAX_TEMPLATES) throw new AccessError(400, `Najviše ${MAX_TEMPLATES} predložaka ureda.`);
  const template = sanitizeTemplate(body, id, session.user.name);
  if (typeof template === "string") throw new AccessError(400, template);
  const updated = existing.some((t) => t.id === id);
  db.settings = { ...(db.settings ?? { sources: {} }), reviewTemplates: updated ? existing.map((t) => (t.id === id ? template : t)) : [...existing, template] };
  addAudit(db, updated ? "Uredio predložak provjere" : "Dodao predložak provjere", template.name, "contract_review");
  await writeDB(db, "contract_review");
  return NextResponse.json({ template }, { status: updated ? 200 : 201 });
});

export const DELETE = apiRoute("contract_review", async (req: Request) => {
  const session = await requireFeature("contract_review");
  if (session.user.role !== "firm_admin") throw new AccessError(403, "Predloške uređuje administrator ureda.");
  const id = new URL(req.url).searchParams.get("id");
  const db = await readDB();
  const template = db.settings?.reviewTemplates?.find((t) => t.id === id);
  if (!template) throw new AccessError(404, "Predložak nije pronađen.");
  db.settings!.reviewTemplates = db.settings!.reviewTemplates!.filter((t) => t !== template);
  addAudit(db, "Uklonio predložak provjere", template.name, "contract_review");
  await writeDB(db, "contract_review");
  return NextResponse.json({ ok: true });
});
