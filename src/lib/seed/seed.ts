import { randomUUID } from "crypto";
import { SEED_CONTRACTS } from "@/lib/seed/contracts";
import { chunkContract } from "@/lib/ingest/chunk";
import { analyzeRuleBased } from "@/lib/ai/analyze";
import type {
  AuditEvent,
  Chunk,
  Client,
  DB,
  DocumentRec,
  Finding,
  KeyTerm,
  Matter,
  Obligation,
} from "@/lib/types";

/** Gradi početnu bazu sa sintetičkim ugovorima (determinističko, sinkrono). */
export function buildSeedDB(): DB {
  const firm = {
    id: "firm",
    name: process.env.LTBLAW_FIRM || "Odvjetničko društvo Marić & Jurić",
  };
  const user = { id: "user", name: "Ana Marić", role: "Odvjetnica · partnerica" };

  const clients: Client[] = [];
  const matters: Matter[] = [];
  const documents: DocumentRec[] = [];
  const chunks: Chunk[] = [];
  const keyTerms: KeyTerm[] = [];
  const obligations: Obligation[] = [];
  const findings: Finding[] = [];
  const audit: AuditEvent[] = [];

  // razmaknute vremenske oznake (zadnji dokument je najnoviji)
  let t = Date.now() - SEED_CONTRACTS.length * 36e5;

  for (const sc of SEED_CONTRACTS) {
    const clientId = randomUUID();
    clients.push({ id: clientId, name: sc.clientName, sector: sc.sector });

    const matterId = randomUUID();
    matters.push({ id: matterId, clientId, title: sc.matterTitle, type: sc.type });

    const docId = randomUUID();
    const raw = chunkContract(sc.text);
    const docChunks: Chunk[] = raw.map((c, i) => ({
      id: randomUUID(),
      documentId: docId,
      index: i,
      heading: c.heading,
      text: c.text,
    }));
    chunks.push(...docChunks);

    const a = analyzeRuleBased(sc.text, docChunks);
    keyTerms.push(...a.keyTerms.map((k) => ({ id: randomUUID(), documentId: docId, ...k })));
    obligations.push(...a.obligations.map((o) => ({ id: randomUUID(), documentId: docId, ...o })));
    findings.push(
      ...a.findings.map((f) => ({
        id: randomUUID(),
        documentId: docId,
        status: "otvoren" as const,
        ...f,
      }))
    );

    const createdAt = new Date(t).toISOString();
    t += 36e5;

    documents.push({
      id: docId,
      title: sc.title,
      filename: sc.filename,
      type: a.type,
      clientId,
      matterId,
      status: "analizirano",
      createdAt,
      summary: a.summary,
      mode: "demo",
    });

    audit.push({
      id: randomUUID(),
      ts: createdAt,
      actor: user.name,
      action: "Učitao i analizirao dokument",
      target: sc.title,
    });
  }

  return { firm, user, clients, matters, documents, chunks, keyTerms, obligations, findings, audit };
}
