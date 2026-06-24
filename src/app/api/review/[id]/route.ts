import { NextResponse } from "next/server";
import { readDB, writeDB, addAudit } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { action } = (await req.json()) as { action: "odobri" | "odbaci" };

  const db = readDB();
  const finding = db.findings.find((f) => f.id === id);
  if (!finding) {
    return NextResponse.json({ error: "Nalaz nije pronađen" }, { status: 404 });
  }

  finding.status = action === "odobri" ? "odobren" : "odbacen";
  const doc = db.documents.find((d) => d.id === finding.documentId);
  addAudit(
    db,
    action === "odobri" ? "Odobrio nalaz pregleda" : "Odbacio nalaz pregleda",
    `${finding.title}${doc ? ` — ${doc.title}` : ""}`
  );
  writeDB(db);

  return NextResponse.json({ ok: true, status: finding.status });
}
