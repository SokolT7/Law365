import { NextResponse } from "next/server";
import { readDB, writeDB, addAudit } from "@/lib/db";
import { verifySecret } from "@/lib/n8n";
import type { ExtractionCallback } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Prima rezultat iz n8n-a (Claude) i upisuje ga u dokument. */
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
  const doc = db.documents.find((d) => d.id === body.documentId);
  if (!doc) {
    return NextResponse.json({ error: "Dokument nije pronađen." }, { status: 404 });
  }
  // zaštita od zastarjelih/ponovljenih callbackova
  if (doc.jobId && body.jobId && doc.jobId !== body.jobId) {
    return NextResponse.json({ error: "Neusklađen jobId." }, { status: 409 });
  }

  if (body.status === "ok" && body.result) {
    doc.result = body.result;
    doc.type = body.result.vrsta || doc.type;
    doc.status = "analizirano";
    doc.error = undefined;
    addAudit(db, "Zaprimljen rezultat analize (Claude)", doc.title);
  } else {
    doc.status = "greska";
    doc.error = body.error || "Analiza nije uspjela.";
    addAudit(db, "Greška u analizi dokumenta", doc.title);
  }

  await writeDB(db);
  return NextResponse.json({ ok: true });
}
