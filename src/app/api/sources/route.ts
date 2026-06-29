import { NextResponse } from "next/server";
import { readDB, writeDB, addAudit } from "@/lib/db";
import { defaultSources, sourceName } from "@/lib/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { id, enabled } = (await req.json()) as { id: string; enabled: boolean };
  if (!id) return NextResponse.json({ error: "Nedostaje id izvora." }, { status: 400 });

  const db = await readDB();
  if (!db.settings) db.settings = { sources: defaultSources() };
  db.settings.sources[id] = !!enabled;
  addAudit(db, enabled ? "Uključio izvor prava" : "Isključio izvor prava", sourceName(id));
  await writeDB(db);

  return NextResponse.json({ ok: true, id, enabled: !!enabled });
}
