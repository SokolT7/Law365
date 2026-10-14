import { NextResponse } from "next/server";
import { AccessError, requireFeature } from "@/lib/auth";
import { apiRoute } from "@/lib/api-access";
import { addAudit, readDB, writeDB } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = apiRoute("legal_questions", async (_req: Request, ctx: Ctx) => {
  const session = await requireFeature("legal_questions");
  const { id } = await ctx.params;
  const thread = (await readDB()).research?.find((t) => t.id === id && t.createdById === session.user.id);
  if (!thread) throw new AccessError(404, "Razgovor nije pronađen.");
  return NextResponse.json({ thread });
});

export const DELETE = apiRoute("legal_questions", async (_req: Request, ctx: Ctx) => {
  const session = await requireFeature("legal_questions");
  const { id } = await ctx.params;
  const db = await readDB();
  const thread = db.research?.find((t) => t.id === id && t.createdById === session.user.id);
  if (!thread) throw new AccessError(404, "Razgovor nije pronađen.");
  db.research = db.research!.filter((t) => t !== thread);
  addAudit(db, "Obrisao istraživanje", thread.title, "legal_questions");
  await writeDB(db, "legal_questions");
  return NextResponse.json({ ok: true });
});
