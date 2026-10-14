import { NextResponse } from "next/server";
import { AccessError, readJsonObject, requireFeature } from "@/lib/auth";
import { apiRoute } from "@/lib/api-access";
import { addAudit, readDB, writeDB } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Records (or clears) a lawyer's decision on one review topic. */
export const POST = apiRoute("contract_review", async (req: Request) => {
  const session = await requireFeature("contract_review");
  const body = (await readJsonObject(req, 8_000)) as { documentId?: unknown; key?: unknown; status?: unknown; comment?: unknown };
  const key = typeof body.key === "string" && /^[a-z0-9-]{1,40}:[a-z0-9-]{1,40}$/.test(body.key) ? body.key : "";
  const status = body.status === "prihvaceno" || body.status === "odbaceno" ? body.status : body.status === null ? undefined : "invalid";
  const comment = typeof body.comment === "string" ? body.comment.trim().slice(0, 2000) : undefined;
  if (typeof body.documentId !== "string" || !key || status === "invalid") throw new AccessError(400, "Neispravan zahtjev.");
  const db = await readDB();
  const doc = db.documents.find((d) => d.id === body.documentId);
  if (!doc) throw new AccessError(404, "Dokument nije pronađen.");
  const decisions = { ...(doc.reviewDecisions ?? {}) };
  const previous = decisions[key];
  const next = { status: status as "prihvaceno" | "odbaceno" | undefined, comment: comment ?? previous?.comment, by: session.user.name, at: new Date().toISOString() };
  if (!next.status && !next.comment) delete decisions[key]; else decisions[key] = next;
  doc.reviewDecisions = decisions;
  addAudit(db, next.status === "prihvaceno" ? "Prihvatio nalaz provjere" : next.status === "odbaceno" ? "Odbacio nalaz provjere" : "Uredio nalaz provjere", `${doc.title} · ${key.split(":")[1]}`, "contract_review");
  await writeDB(db, "contract_review");
  return NextResponse.json({ decision: decisions[key] ?? null });
});
