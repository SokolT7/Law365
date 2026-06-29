import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readDB, writeDB, addAudit } from "@/lib/db";
import { parseFile, isSupported } from "@/lib/ingest/parse";
import { chunkContract } from "@/lib/ingest/chunk";
import { fireExtraction, getBaseUrl } from "@/lib/n8n";
import { MODE_LABEL } from "@/lib/docs";
import type { Analysis, AnalysisMode, Chunk, DocumentRec } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function titleFromName(name: string): string {
  const base = name.replace(/\.(pdf|docx|txt|md)$/i, "").replace(/[-_]+/g, " ").trim();
  return base.charAt(0).toUpperCase() + base.slice(1);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  const modeRaw = String(form.get("mode") || "sazetak");
  const mode: AnalysisMode = modeRaw === "detaljna" ? "detaljna" : "sazetak";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Datoteka nije priložena." }, { status: 400 });
  }
  if (!isSupported(file.name)) {
    return NextResponse.json(
      { error: "Nepodržan format. Koristite .pdf, .docx ili .txt." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text: string;
  try {
    text = await parseFile(file.name, buffer);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (!text || text.trim().length < 40) {
    return NextResponse.json(
      { error: "Dokument je prazan ili se nije mogao pročitati." },
      { status: 400 }
    );
  }

  const db = await readDB();
  const docId = randomUUID();
  const jobId = randomUUID();
  const title = titleFromName(file.name);
  const now = new Date().toISOString();

  const clientId = randomUUID();
  db.clients.push({ id: clientId, name: "Ručno učitani dokument", sector: "—" });
  const matterId = randomUUID();
  db.matters.push({ id: matterId, clientId, title: `Ručno učitavanje — ${title}`, type: "Dokument" });

  // indeksiranje teksta (za pitanja i odgovore + ponovnu obradu)
  const chunks: Chunk[] = chunkContract(text).map((c, i) => ({
    id: randomUUID(),
    documentId: docId,
    index: i,
    heading: c.heading,
    text: c.text,
  }));
  db.chunks.push(...chunks);

  const analysis: Analysis = { mode, status: "u_obradi", jobId, createdAt: now };
  const doc: DocumentRec = {
    id: docId,
    title,
    filename: file.name,
    type: "Dokument",
    clientId,
    matterId,
    createdAt: now,
    analyses: [analysis],
  };
  db.documents.push(doc);
  addAudit(db, `Učitao dokument na obradu (${MODE_LABEL[mode]})`, title);

  try {
    await fireExtraction({
      documentId: docId,
      jobId,
      mode,
      filename: file.name,
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
  return NextResponse.json({ id: docId, mode, status: analysis.status });
}
