import { randomUUID } from "crypto";
import { requireSession, requireFeature } from "@/lib/auth";
import { getFirm, readFirmData, writeFirmData, writeFirmDataAndRegisterJob } from "@/lib/platform";
import { hasFeature, type FeatureKey } from "@/lib/features";
import type { AnalysisMode, AuditEvent, DB } from "@/lib/types";

const snapshots = new WeakMap<DB, { firmId: string; revision: number; service: boolean }>();

function load(firmId: string, actor: DB["user"], service = false): DB {
  const firm = getFirm(firmId);
  if (!firm) throw new Error("Ured nije pronađen.");
  const stored = readFirmData(firmId);
  const db: DB = stored?.data ?? {
    firm: {id: firm.id, name: firm.name}, user: actor,
    clients: [], matters: [], documents: [], chunks: [], audit: [], regUpdates: [],
    settings: {sources: {"vasi-dokumenti":true}},
  };
  db.firm = {id:firm.id, name:firm.name};
  db.user = actor;
  snapshots.set(db, {firmId, revision: stored?.revision ?? 0, service});
  return db;
}

export async function readDB(): Promise<DB> {
  const session = await requireSession();
  if (!session.firm || session.user.role === "platform_admin") throw new Error("Odaberite ovlašteni radni prostor.");
  return load(session.firm.id, {id:session.user.id, name:session.user.name, role:session.user.role});
}

/** Presentation projection: disabled modules cannot leak through adjacent pages. Never write this copy. */
export async function readWorkspaceDB(): Promise<DB> {
  const session = await requireSession();
  const original = await readDB();
  const db = structuredClone(original);
  const enabled = (key: Parameters<typeof hasFeature>[1]) => hasFeature(session.firm, key);
  if (!enabled("documents")) { db.documents = []; db.chunks = []; db.matters = []; }
  if (!enabled("clients")) { db.clients = []; db.matters = []; }
  if (!enabled("regulatory_tracking")) db.regUpdates = [];
  // Research history is private to each user.
  db.research = enabled("legal_questions") ? (db.research ?? []).filter((thread) => thread.createdById === session.user.id) : [];
  db.audit = enabled("activity_log") ? db.audit.filter(event => event.feature ? enabled(event.feature) : false) : [];
  for (const doc of db.documents) {
    doc.analyses = doc.analyses.filter(a => enabled(a.mode === "sazetak" ? "summary_analysis" : "detailed_analysis"));
    if (!enabled("document_chat")) doc.conversation = [];
  }
  return db;
}

export async function writeDB(db: DB, feature?: FeatureKey): Promise<void> {
  const snapshot = snapshots.get(db);
  if (!snapshot) throw new Error("Neispravan kontekst spremanja.");
  if (!snapshot.service) {
    const session = feature ? await requireFeature(feature) : await requireSession();
    if (session.firm?.id !== snapshot.firmId) throw new Error("Pristup nije dopušten.");
  }
  snapshot.revision = writeFirmData(snapshot.firmId, db, snapshot.revision);
}

/** Service-only entry: callers must authenticate callbacks and resolve a persisted job first. */
export function readJobDB(firmId: string): DB {
  return load(firmId, {id:"processing-service",name:"Obrada dokumenata",role:"service"}, true);
}

export function addAudit(db: DB, action: string, target: string, feature?: FeatureKey): void {
  const event: AuditEvent = {id: randomUUID(), ts:new Date().toISOString(), actor:db.user.name, action, target, feature};
  db.audit.unshift(event);
}

/** Commit analysis and callback ownership as one transaction. */
export async function writeDBWithJob(db: DB, jobId: string, documentId: string, mode: AnalysisMode): Promise<void> {
  const snapshot = snapshots.get(db);
  if (!snapshot || snapshot.service) throw new Error("Neispravan kontekst obrade.");
  const session = await requireFeature(mode === "sazetak" ? "summary_analysis" : "detailed_analysis");
  if (session.firm.id !== snapshot.firmId) throw new Error("Pristup nije dopušten.");
  snapshot.revision = writeFirmDataAndRegisterJob(snapshot.firmId, db, snapshot.revision, jobId, documentId, mode);
}
