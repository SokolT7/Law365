import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { readDB, writeDB, addAudit } from "@/lib/db";
import { parseFile, isSupported } from "@/lib/ingest/parse";
import { chunkContract } from "@/lib/ingest/chunk";
import type { Chunk } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Dodaje još dokumenata u postojeći radni prostor. */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const form = await req.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
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
  addAudit(db, "Dodao dokument u razgovor", added.join(", "));
  await writeDB(db);

  return NextResponse.json({ ok: true, added });
}
