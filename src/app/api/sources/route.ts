import { readJsonObject } from "@/lib/auth";
import { requireFeature, AccessError } from "@/lib/auth";
import { isSourceAvailable, allSourceItems } from "@/lib/sources";
import { firmSources } from "@/lib/research/firm-sources";
import { apiRoute } from "@/lib/api-access";
import { NextResponse } from "next/server";
import { readDB, writeDB, addAudit } from "@/lib/db";
import { defaultSources, sourceName } from "@/lib/sources";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handlePOST(req: Request) {
  const session = await requireFeature("source_settings");
  if (session.user.role !== "firm_admin") throw new AccessError(403,"Postavke mijenja administrator ureda.");
  const { id, enabled } = (await readJsonObject(req)) as { id: string; enabled: boolean };
  const db = await readDB();
  const { sources, connected } = firmSources(db);
  if (!id || !allSourceItems().some(s => s.id === id) || typeof enabled !== "boolean" || !isSourceAvailable(id, connected)) throw new AccessError(400,"Izvor nije dostupan.");
  // From the first explicit choice on, the admin's settings are authoritative.
  db.settings = { ...(db.settings ?? { sources: defaultSources() }), sources: { ...sources, [id]: !!enabled }, sourcesReviewed: true };
  addAudit(db, enabled ? "Uključio izvor prava" : "Isključio izvor prava", sourceName(id), "source_settings");
  await writeDB(db, "source_settings");

  return NextResponse.json({ ok: true, id, enabled: !!enabled });
}

export const POST = apiRoute("source_settings", handlePOST);
