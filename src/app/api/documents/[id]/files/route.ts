import { requireFeature, AccessError } from "@/lib/auth";
import { hasFeature } from "@/lib/features";
import { apiRoute, readUploadForm } from "@/lib/api-access";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readDB, writeDB, addAudit } from "@/lib/db";
import { parseFile, isSupported } from "@/lib/ingest/parse";
import { chunkContract } from "@/lib/ingest/chunk";
import type { Chunk } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dodaje još dokumenata u postojeći radni prostor. */
async function handlePOST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await requireFeature("documents");
  if (Number(req.headers.get("content-length") || 0) > 26 * 1024 * 1024) throw new AccessError(413,"Zahtjev je prevelik (najviše 25 MB).");
  const form = await readUploadForm(req);
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length > 10 || files.some(f => f.size > 10 * 1024 * 1024) || files.reduce((n,f)=>n+f.size,0) > 25*1024*1024) throw new AccessError(413,"Najviše 10 datoteka, 10 MB po datoteci i 25 MB ukupno.");
  if (files.length === 0) {
    return NextResponse.json({ error: "Datoteka nije priložena." }, { status: 400 });
  }

  const db = await readDB();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) return NextResponse.json({ error: "Dokument nije pronađen." }, { status: 404 });

  const base = db.chunks.filter((c) => c.documentId === id).length;
  const chunks: Chunk[] = [];
  const added: string[] = [];

  for (const file of files) {
    if (!isSupported(file.name)) continue;
    const buffer = Buffer.from(await file.arrayBuffer());
    let text: string;
    try {
      text = await parseFile(file.name, buffer);
    } catch {
      continue;
    }
    if (!text || text.trim().length < 40) continue;
    added.push(file.name);
    chunkContract(text).forEach((c, i) =>
      chunks.push({
        id: randomUUID(),
        documentId: id,
        index: base + chunks.length + i,
        heading: `${file.name} · ${c.heading}`,
        text: c.text,
      })
    );
  }

  if (added.length === 0) {
    return NextResponse.json({ error: "Dokumenti su nečitljivi ili nepodržani." }, { status: 400 });
  }

  db.chunks.push(...chunks);
  doc.files = [...(doc.files ?? [doc.filename]), ...added];
  addAudit(db, "Dodao dokument u razgovor", added.join(", "), "documents");
  await writeDB(db, "documents");

  return NextResponse.json({ ok: true, added });
}

export const POST = apiRoute("documents", handlePOST);
