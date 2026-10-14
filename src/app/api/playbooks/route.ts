import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { AccessError, readJsonObject, requireFeature } from "@/lib/auth";
import { apiRoute } from "@/lib/api-access";
import { addAudit, readDB, writeDB } from "@/lib/db";
import { allPlaybooks, type Playbook } from "@/lib/research/playbooks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiRoute("legal_questions", async () => {
  const db = await readDB();
  return NextResponse.json({ playbooks: allPlaybooks(db.settings?.playbooks) });
});

/** Firm admins create firm playbooks; every member can use them. */
export const POST = apiRoute("legal_questions", async (req: Request) => {
  const session = await requireFeature("legal_questions");
  if (session.user.role !== "firm_admin") throw new AccessError(403, "Asistente ureda uređuje administrator ureda.");
  const body = (await readJsonObject(req, 32_000)) as Record<string, unknown>;
  const text = (k: string, max: number) => (typeof body[k] === "string" ? (body[k] as string).trim().slice(0, max) : "");
  const name = text("name", 80), instructions = text("instructions", 4000), description = text("description", 240);
  if (!name || instructions.length < 20) throw new AccessError(400, "Unesite naziv i upute (najmanje 20 znakova).");
  const starters = Array.isArray(body.starters) ? (body.starters as unknown[]).filter((s): s is string => typeof s === "string" && !!s.trim()).map((s) => s.trim().slice(0, 600)).slice(0, 4) : [];
  const db = await readDB();
  const playbook: Playbook = { id: `ured-${randomUUID().slice(0, 8)}`, name, description, instructions, starters, createdBy: session.user.name };
  db.settings = { ...(db.settings ?? { sources: {} }), playbooks: [...(db.settings?.playbooks ?? []), playbook] };
  addAudit(db, "Dodao asistenta ureda", name, "legal_questions");
  await writeDB(db, "legal_questions");
  return NextResponse.json({ playbook }, { status: 201 });
});

export const DELETE = apiRoute("legal_questions", async (req: Request) => {
  const session = await requireFeature("legal_questions");
  if (session.user.role !== "firm_admin") throw new AccessError(403, "Asistente ureda uređuje administrator ureda.");
  const id = new URL(req.url).searchParams.get("id");
  const db = await readDB();
  const playbook = db.settings?.playbooks?.find((p) => p.id === id);
  if (!playbook) throw new AccessError(404, "Asistent nije pronađen.");
  db.settings!.playbooks = db.settings!.playbooks!.filter((p) => p !== playbook);
  addAudit(db, "Uklonio asistenta ureda", playbook.name, "legal_questions");
  await writeDB(db, "legal_questions");
  return NextResponse.json({ ok: true });
});
