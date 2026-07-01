import { NextResponse } from "next/server";
import { readDB, writeDB, addAudit } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Označava regulatornu promjenu kao pregledanu / nepregledanu. */
export async function POST(req: Request) {
  const { id, reviewed } = (await req.json()) as { id: string; reviewed: boolean };
  if (!id) return NextResponse.json({ error: "Nedostaje id." }, { status: 400 });

  const db = await readDB();
  const item = (db.regUpdates ?? []).find((r) => r.id === id);
  if (!item) return NextResponse.json({ error: "Stavka nije pronađena." }, { status: 404 });

  item.reviewed = !!reviewed;
  addAudit(db, reviewed ? "Pregledao regulatornu promjenu" : "Vratio regulatornu promjenu u nepregledano", item.title.slice(0, 80));
  await writeDB(db);
  return NextResponse.json({ ok: true });
}
