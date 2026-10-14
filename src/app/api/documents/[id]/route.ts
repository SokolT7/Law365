import { readJsonObject } from "@/lib/auth";
import { requireFeature, AccessError } from "@/lib/auth";
import { hasFeature } from "@/lib/features";
import { completeJob } from "@/lib/platform";
import { apiRoute } from "@/lib/api-access";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readDB, writeDB, writeDBWithJob, readJobDB, addAudit } from "@/lib/db";
import { fireExtraction, getBaseUrl } from "@/lib/n8n";
import { MODE_LABEL, analysisOf, documentText } from "@/lib/docs";
import type { Analysis, AnalysisMode } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Prozivanje (polling) — statusi svih obrada dokumenta. */
async function handleGET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireFeature("documents");
  const { id } = await params;
  const db = await readDB();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return NextResponse.json({ error: "Dokument nije pronađen" }, { status: 404 });
  return NextResponse.json({
    id: doc.id,
    analyses: doc.analyses.filter(a => hasFeature(session.firm, a.mode === "sazetak" ? "summary_analysis" : "detailed_analysis")).map((a) => ({
      mode: a.mode,
      status: a.status,
      error: a.error ?? null,
    })),
  });
}

/** Pokreće izradu druge vrste obrade (Sažetak / Detaljna analiza) za postojeći dokument. */
async function handlePOST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { mode: modeRaw } = (await readJsonObject(req)) as { mode?: string };
  if (modeRaw !== "detaljna" && modeRaw !== "sazetak") throw new AccessError(400,"Nepoznata vrsta obrade.");
  const mode: AnalysisMode = modeRaw;
  const session = await requireFeature(mode === "sazetak" ? "summary_analysis" : "detailed_analysis");

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
  addAudit(db, `Pokrenuo obradu (${MODE_LABEL[mode]})`, doc.title, mode === "sazetak" ? "summary_analysis" : "detailed_analysis");

  await writeDBWithJob(db, jobId, id, mode);
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
    const current = readJobDB(session.firm.id);
    const pending = current.documents.find(d=>d.id===id)?.analyses.find(a=>a.jobId===jobId);
    if (pending?.status === "u_obradi") {
      pending.status = "greska";
      pending.completedAt = new Date().toISOString();
      pending.error = "Obrada trenutačno nije dostupna. Pokušajte ponovno ili se obratite administratoru.";
      await writeDB(current);
      completeJob(jobId,"failed");
    }
    return NextResponse.json({error:"Obrada trenutačno nije dostupna.",mode,status:"greska"},{status:503});
  }

  return NextResponse.json({ ok: true, mode, status: analysis.status });
}

export const GET = apiRoute("documents", handleGET);

export const POST = apiRoute("documents", handlePOST);
