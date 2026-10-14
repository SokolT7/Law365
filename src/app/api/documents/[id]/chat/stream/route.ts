import { randomUUID } from "crypto";
import { AccessError, readJsonObject } from "@/lib/auth";
import { apiRoute } from "@/lib/api-access";
import { addAudit, readDB, writeDB } from "@/lib/db";
import { getMode } from "@/lib/ai/client";
import { runResearch } from "@/lib/research/engine";
import { firmSources } from "@/lib/research/firm-sources";
import { sseResponse } from "@/lib/research/sse";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Streaming document chat: same protocol as research, scoped to one document. */
async function handlePOST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = (await readJsonObject(req, 8 * 1024 * 1024)) as { message?: unknown; image?: { mediaType: string; data: string } };
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const image = body.image;
  if (!message || message.length > 12000) throw new AccessError(400, "Provjerite pitanje (najviše 12.000 znakova).");
  if (image && (typeof image.data !== "string" || image.data.length > 7 * 1024 * 1024 || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(image.mediaType))) throw new AccessError(400, "Slika nije podržana.");
  const db = await readDB();
  const doc = db.documents.find((d) => d.id === id);
  if (!doc) throw new AccessError(404, "Dokument nije pronađen.");
  const userMsg: ChatMessage = { id: randomUUID(), role: "user", text: message, ts: new Date().toISOString(), hasImage: !!image };
  const messageId = randomUUID();
  const events = runResearch({
    question: message, scope: "document", documentTitle: doc.title, mode: getMode(), signal: req.signal, image,
    sources: firmSources(db).sources, history: (doc.conversation ?? []).map((m) => ({ role: m.role, text: m.text })),
    chunks: db.chunks.filter((c) => c.documentId === id), docs: db.documents,
  }, messageId);

  return sseResponse(events, async ({ message: answer }) => {
    const fresh = await readDB();
    const target = fresh.documents.find((d) => d.id === id);
    if (!target) return;
    const firm = (answer.sources ?? []).filter((s) => s.kind === "firm");
    const aiMsg: ChatMessage = {
      id: answer.id, role: "assistant", text: answer.text, ts: answer.ts, sources: answer.sources, steps: answer.steps,
      verification: answer.verification, calculation: answer.calculation, stopped: answer.stopped,
      // Back-compat for older clients that read `citations`.
      citations: firm.map((s) => ({ documentId: s.documentId, chunkId: s.chunkId, documentTitle: s.title, heading: s.heading ?? "", snippet: s.excerpt.slice(0, 260) })),
    };
    target.conversation = [...(target.conversation ?? []), userMsg, aiMsg];
    addAudit(fresh, "Postavio pitanje u razgovoru", target.title, "document_chat");
    await writeDB(fresh, "document_chat");
  });
}

export const POST = apiRoute("document_chat", handlePOST);
