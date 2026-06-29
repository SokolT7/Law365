import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readDB, writeDB, addAudit } from "@/lib/db";
import { fireExtraction, getBaseUrl } from "@/lib/n8n";
import { MODE_LABEL, analysisOf, documentText } from "@/lib/docs";
import type { Analysis, AnalysisMode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Prozivanje (polling) — statusi svih obrada dokumenta. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await readDB();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return NextResponse.json({ error: "Dokument nije pronađen" }, { status: 404 });
  return NextResponse.json({
    id: doc.id,
    analyses: doc.analyses.map((a) => ({
      mode: a.mode,
      status: a.status,
      error: a.error ?? null,
    })),
  });
}

/** Pokreće izradu druge vrste obrade (Sažetak / Detaljna analiza) za postojeći dokument. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { mode: modeRaw } = (await req.json()) as { mode?: string };
  const mode: AnalysisMode = modeRaw === "detaljna" ? "detaljna" : "sazetak";

  const db = await readDB();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return NextResponse.json({ error: "Dokument nije pronađen" }, { status: 404 });

  const existing = analysisOf(doc, mode);
  if (existing && existing.status !== "greska") {
    return NextResponse.json({ ok: true, mode, status: existing.status });
  }

  const text = documentText(db, id);
  if (!text) {
    return NextResponse.json({ error: "Tekst dokumenta nije dostupan." }, { status: 400 });
  }

  const jobId = randomUUID();
  const now = new Date().toISOString();
  const analysis: Analysis = { mode, status: "u_obradi", jobId, createdAt: now };
  // zamijeni neuspjelu obradu ili dodaj novu
  doc.analyses = doc.analyses.filter((a) => a.mode !== mode);
  doc.analyses.push(analysis);
  addAudit(db, `Pokrenuo obradu (${MODE_LABEL[mode]})`, doc.title);

  try {
    await fireExtraction({
      documentId: id,
      jobId,
      mode,
      filename: doc.filename,
      text,
      baseUrl: getBaseUrl(req),
      firmName: db.firm.name,
      userName: db.user.name,
    });
  } catch (e) {
    analysis.status = "greska";
    analysis.error = (e as Error).message;
  }

  await writeDB(db);
  return NextResponse.json({ ok: true, mode, status: analysis.status });
}
