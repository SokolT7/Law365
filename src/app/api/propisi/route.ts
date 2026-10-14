import { readJsonObject } from "@/lib/auth";
import { AccessError } from "@/lib/auth";
import { apiRoute } from "@/lib/api-access";
import { NextResponse } from "next/server";
import { readDB, writeDB, addAudit } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Označava regulatornu promjenu kao pregledanu / nepregledanu. */
async function handlePOST(req: Request) {
  const { id, reviewed } = (await readJsonObject(req)) as { id: string; reviewed: boolean };
  if (typeof id !== "string" || typeof reviewed !== "boolean") throw new AccessError(400,"Neispravan zahtjev.");
  if (!id) return NextResponse.json({ error: "Nedostaje id." }, { status: 400 });

  const db = await readDB();
  const item = (db.regUpdates ?? []).find((r) => r.id === id);
  if (!item) return NextResponse.json({ error: "Stavka nije pronađena." }, { status: 404 });

  item.reviewed = !!reviewed;
  addAudit(db, reviewed ? "Pregledao regulatornu promjenu" : "Vratio regulatornu promjenu u nepregledano", item.title.slice(0, 80), "regulatory_tracking");
  await writeDB(db, "regulatory_tracking");
  return NextResponse.json({ ok: true });
}

export const POST = apiRoute("regulatory_tracking", handlePOST);
