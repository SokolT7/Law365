import { NextResponse } from "next/server";
import { readDB, writeDB, addAudit } from "@/lib/db";
import { verifySecret } from "@/lib/n8n";
import { MODE_LABEL } from "@/lib/docs";
import type { ExtractionCallback } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Prima rezultat iz n8n-a (Claude) i upisuje ga u odgovarajuću obradu (po jobId). */
export async function POST(req: Request) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: "Neispravna tajna." }, { status: 401 });
  }

  let body: ExtractionCallback;
  try {
    body = (await req.json()) as ExtractionCallback;
  } catch {
    return NextResponse.json({ error: "Neispravan JSON." }, { status: 400 });
  }

  const db = await readDB();
  const doc = db.documents.find((d) => d.analyses.some((a) => a.jobId === body.jobId));
  if (!doc) {
    return NextResponse.json({ error: "Obrada nije pronađena." }, { status: 404 });
  }
  const analysis = doc.analyses.find((a) => a.jobId === body.jobId)!;

  if (body.status === "ok" && body.result) {
    analysis.result = body.result;
    analysis.status = "analizirano";
    analysis.error = undefined;
    if (body.result.vrsta) doc.type = body.result.vrsta;
    addAudit(db, `Zaprimljen rezultat (${MODE_LABEL[analysis.mode]})`, doc.title);
  } else {
    analysis.status = "greska";
    analysis.error = body.error || "Analiza nije uspjela.";
    addAudit(db, `Greška u obradi (${MODE_LABEL[analysis.mode]})`, doc.title);
  }

  await writeDB(db);
  return NextResponse.json({ ok: true });
}
