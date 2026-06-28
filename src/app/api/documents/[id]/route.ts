import { NextResponse } from "next/server";
import { readDB } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Izvor istine za prozivanje (polling) iz preglednika. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = await readDB();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) {
    return NextResponse.json({ error: "Dokument nije pronađen" }, { status: 404 });
  }
  return NextResponse.json({
    id: doc.id,
    status: doc.status,
    error: doc.error ?? null,
    hasResult: !!doc.result,
  });
}
