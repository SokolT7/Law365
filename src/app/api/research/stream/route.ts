import { randomUUID } from "crypto";
import { AccessError, readJsonObject, requireFeature } from "@/lib/auth";
import { apiRoute } from "@/lib/api-access";
import { addAudit, readDB, writeDB } from "@/lib/db";
import { hasFeature } from "@/lib/features";
import { getMode } from "@/lib/ai/client";
import { runResearch } from "@/lib/research/engine";
import { firmSources } from "@/lib/research/firm-sources";
import { findPlaybook } from "@/lib/research/playbooks";
import { sseResponse } from "@/lib/research/sse";
import type { ResearchMessage, ResearchThread } from "@/lib/research/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_THREADS = 300;

async function handlePOST(req: Request) {
  const session = await requireFeature("legal_questions");
  const body = (await readJsonObject(req, 64_000)) as { question?: unknown; threadId?: unknown; playbookId?: unknown; clientId?: unknown };
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question || question.length > 12000) throw new AccessError(400, "Provjerite pitanje (najviše 12.000 znakova).");
  const threadId = typeof body.threadId === "string" && body.threadId ? body.threadId : randomUUID();
  const db = await readDB();
  const existing = (db.research ?? []).find((t) => t.id === threadId && t.createdById === session.user.id);
  if (typeof body.threadId === "string" && body.threadId && !existing) throw new AccessError(404, "Razgovor nije pronađen.");
  const playbook = findPlaybook(typeof body.playbookId === "string" ? body.playbookId : undefined, db.settings?.playbooks);
  const canReadDocuments = hasFeature(session.firm, "documents");
  // Optional client scope: only that client's documents are searched (public law is unaffected).
  const clientId = typeof body.clientId === "string" && body.clientId ? body.clientId : existing?.clientId;
  if (clientId && (!hasFeature(session.firm, "clients") || !db.clients.some((c) => c.id === clientId))) throw new AccessError(400, "Odabrani klijent nije dostupan.");
  const scopedDocs = canReadDocuments ? db.documents.filter((d) => !clientId || d.clientId === clientId) : [];
  const scopedIds = new Set(scopedDocs.map((d) => d.id));
  const { sources } = firmSources(db);
  const messageId = randomUUID();
  const userMessage: ResearchMessage = { id: randomUUID(), role: "user", text: question, ts: new Date().toISOString(), playbookId: playbook?.id };

  async function* events() {
    yield { type: "thread" as const, threadId, messageId };
    yield* runResearch({
      question, scope: "research", mode: getMode(), playbook, signal: req.signal, sources,
      history: (existing?.messages ?? []).map((m) => ({ role: m.role, text: m.text })),
      chunks: db.chunks.filter((c) => scopedIds.has(c.documentId)), docs: scopedDocs,
    }, messageId);
  }

  return sseResponse(events(), async ({ message }) => {
    // Re-read so concurrent edits (other tabs, other users) are not overwritten.
    const fresh = await readDB();
    const threads = fresh.research ?? [];
    let thread = threads.find((t) => t.id === threadId && t.createdById === session.user.id);
    const now = new Date().toISOString();
    if (!thread) {
      thread = { id: threadId, title: question.length > 90 ? `${question.slice(0, 90).trim()}…` : question, createdAt: now, updatedAt: now, createdBy: session.user.name, createdById: session.user.id, clientId, messages: [] } satisfies ResearchThread;
      threads.unshift(thread);
      addAudit(fresh, "Postavio pravno pitanje", thread.title, "legal_questions");
    }
    thread.messages.push(userMessage, message);
    thread.updatedAt = now;
    fresh.research = threads.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, MAX_THREADS);
    await writeDB(fresh, "legal_questions");
  });
}

export const POST = apiRoute("legal_questions", handlePOST);
