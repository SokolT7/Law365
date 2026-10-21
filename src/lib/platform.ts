import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import path from "node:path";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { PLATFORM_SCHEMA, hashPassword, verifyPassword } from "./platform-core.mjs";
import { hasFeature, validateFeatures, type FeatureKey } from "./features";
import type { AnalysisMode, DB } from "./types";
import { isPublicDemo, publicDemoFile } from "./public-demo";

export type Role = "platform_admin" | "firm_admin" | "member";
export type FirmStatus = "draft" | "active" | "suspended";
export type UserStatus = "invited" | "active" | "disabled";
export interface FirmRecord {
  id: string; name: string; legalName: string; accent: string; greeting: string;
  status: FirmStatus; features: FeatureKey[]; createdAt: string; updatedAt: string;
}
export interface PublicUser {
  id: string; name: string; email: string; role: Role; firmId: string | null;
  status: UserStatus; createdAt: string;
}
export interface Session { user: PublicUser; firm?: FirmRecord }
export interface PlatformAudit {
  id: string; actorId: string; actorName: string; action: string;
  targetType: string; targetId: string; before: unknown; after: unknown; createdAt: string;
}
export class AccessError extends Error {
  constructor(public status: number, message: string) { super(message); this.name = "AccessError"; }
}

let connection: DatabaseSync | undefined;
function database(): DatabaseSync {
  if (connection) return connection;
  if (!isPublicDemo() && (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME)) {
    throw new Error("LTB Law requires a persistent single-host disk. Configure a managed database before deploying to ephemeral hosting.");
  }
  const filename = isPublicDemo() ? publicDemoFile("platform.sqlite") : process.env.LTB_DATABASE_PATH || path.join(process.cwd(), "data", "platform.sqlite");
  if (filename !== ":memory:") mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(filename);
  db.exec("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;");
  db.exec(PLATFORM_SCHEMA);
  if (filename !== ":memory:") chmodSync(filename, 0o600);
  connection = db;
  return db;
}

function transaction<T>(work: (db: DatabaseSync) => T): T {
  const db = database();
  db.exec("BEGIN IMMEDIATE");
  try { const result = work(db); db.exec("COMMIT"); return result; }
  catch (error) { db.exec("ROLLBACK"); throw error; }
}
type Row = Record<string, unknown>;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
const iso = () => new Date().toISOString();
function text(value: unknown, label: string, max = 160): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) throw new AccessError(400, `Provjerite polje: ${label}.`);
  return value.trim();
}
function emailAddress(value: unknown): string {
  const email = text(value, "e-pošta", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AccessError(400, "Unesite valjanu adresu e-pošte.");
  return email;
}
function firmFrom(row: Row): FirmRecord {
  return { id: String(row.id), name: String(row.name), legalName: String(row.legal_name), accent: String(row.accent), greeting: String(row.greeting), status: row.status as FirmStatus, features: JSON.parse(String(row.features)), createdAt: String(row.created_at), updatedAt: String(row.updated_at) };
}
function userFrom(row: Row): PublicUser {
  return { id: String(row.id), name: String(row.name), email: String(row.email), role: row.role as Role, firmId: row.firm_id ? String(row.firm_id) : null, status: row.status as UserStatus, createdAt: String(row.created_at) };
}
function audit(db: DatabaseSync, actorId: string, action: string, targetType: string, targetId: string, before: unknown, after: unknown) {
  db.prepare("INSERT INTO platform_audit VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(randomUUID(), actorId, action, targetType, targetId, before == null ? null : JSON.stringify(before), after == null ? null : JSON.stringify(after), iso());
}
function assertAdmin(actorId: string) {
  const user = getUser(actorId);
  if (!user || user.role !== "platform_admin" || user.status !== "active") throw new AccessError(403, "Pristup je dopušten samo LTB administratoru.");
}

export function hasPlatformAdmin(): boolean {
  return Boolean(database().prepare("SELECT id FROM users WHERE role = 'platform_admin' AND status = 'active' LIMIT 1").get());
}
export function listFirms(): FirmRecord[] { return database().prepare("SELECT * FROM firms ORDER BY created_at DESC").all().map(firmFrom); }
export function getFirm(id: string): FirmRecord | null { const row = database().prepare("SELECT * FROM firms WHERE id = ?").get(id); return row ? firmFrom(row) : null; }
export function getUser(id: string): PublicUser | null { const row = database().prepare("SELECT * FROM users WHERE id = ?").get(id); return row ? userFrom(row) : null; }
export function listUsers(firmId?: string): PublicUser[] {
  return (firmId ? database().prepare("SELECT * FROM users WHERE firm_id = ? ORDER BY created_at DESC").all(firmId) : database().prepare("SELECT * FROM users ORDER BY created_at DESC").all()).map(userFrom);
}
export function listPlatformAudit(limit = 100): PlatformAudit[] {
  return database().prepare("SELECT a.*, u.name AS actor_name FROM platform_audit a LEFT JOIN users u ON u.id = a.actor_id ORDER BY a.created_at DESC LIMIT ?").all(Math.min(500, Math.max(1, Math.floor(limit)))).map((row) => ({ id: String(row.id), actorId: String(row.actor_id), actorName: String(row.actor_name || "LTB"), action: String(row.action), targetType: String(row.target_type), targetId: String(row.target_id), before: row.before_json ? JSON.parse(String(row.before_json)) : null, after: row.after_json ? JSON.parse(String(row.after_json)) : null, createdAt: String(row.created_at) }));
}

export type FirmInput = Partial<Pick<FirmRecord, "name" | "legalName" | "accent" | "greeting" | "status" | "features">>;
function firmValues(input: FirmInput, existing?: FirmRecord) {
  const name = text(input.name ?? existing?.name, "naziv ureda");
  const legalName = text(input.legalName ?? existing?.legalName ?? name, "pravni naziv", 250);
  const accent = input.accent ?? existing?.accent ?? "#3D5FE5";
  if (!/^#[0-9a-f]{6}$/i.test(accent)) throw new AccessError(400, "Boja mora biti u obliku #3D5FE5.");
  const greeting = String(input.greeting ?? existing?.greeting ?? "Vaš pravni rad, jasno organiziran.").trim();
  if (greeting.length > 240) throw new AccessError(400, "Pozdrav može sadržavati do 240 znakova.");
  const status = input.status ?? existing?.status ?? "draft";
  if (!["draft", "active", "suspended"].includes(status)) throw new AccessError(400, "Neispravan status ureda.");
  let features: FeatureKey[];
  try { features = validateFeatures(input.features ?? existing?.features ?? []); }
  catch (error) { throw new AccessError(400, error instanceof Error ? error.message : "Neispravne funkcije."); }
  return { name, legalName, accent, greeting, status: status as FirmStatus, features };
}
export function createFirm(input: FirmInput, actorId: string): FirmRecord {
  assertAdmin(actorId);
  const now = iso(); const firm = { id: randomUUID(), ...firmValues(input), createdAt: now, updatedAt: now };
  transaction((db) => { db.prepare("INSERT INTO firms VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").run(firm.id, firm.name, firm.legalName, firm.accent, firm.greeting, firm.status, JSON.stringify(firm.features), now, now); audit(db, actorId, "Ured je izrađen", "firm", firm.id, null, firm); });
  return firm;
}
export function updateFirm(id: string, input: FirmInput, actorId: string): FirmRecord {
  assertAdmin(actorId);
  return transaction((db) => {
    const before = getFirm(id); if (!before) throw new AccessError(404, "Ured nije pronađen.");
    const firm = { ...before, ...firmValues(input, before), updatedAt: iso() };
    db.prepare("UPDATE firms SET name=?, legal_name=?, accent=?, greeting=?, status=?, features=?, updated_at=? WHERE id=?").run(firm.name, firm.legalName, firm.accent, firm.greeting, firm.status, JSON.stringify(firm.features), firm.updatedAt, id);
    if (firm.status !== "active") db.prepare("DELETE FROM sessions WHERE user_id IN (SELECT id FROM users WHERE firm_id=?)").run(id);
    audit(db, actorId, "Postavke ureda su promijenjene", "firm", id, before, firm);
    return firm;
  });
}

function issueInvitation(db: DatabaseSync, userId: string) {
  const token = randomBytes(32).toString("base64url"); const now = Date.now(); const expiresAt = now + 48 * 60 * 60 * 1000;
  db.prepare("UPDATE invitations SET revoked_at=? WHERE user_id=? AND used_at IS NULL AND revoked_at IS NULL").run(now, userId);
  db.prepare("INSERT INTO invitations VALUES (?, ?, ?, ?, NULL, NULL, ?)").run(randomUUID(), digest(token), userId, expiresAt, now);
  return { token, expiresAt: new Date(expiresAt).toISOString() };
}
export function inviteUser(input: { firmId: string; name: string; email: string; role?: "firm_admin" | "member" }, actorId: string) {
  assertAdmin(actorId);
  const firm = getFirm(input.firmId); if (!firm) throw new AccessError(404, "Ured nije pronađen.");
  const name = text(input.name, "ime i prezime"); const email = emailAddress(input.email); const role = input.role ?? "member";
  if (!["firm_admin", "member"].includes(role)) throw new AccessError(400, "Neispravna uloga korisnika.");
  return transaction((db) => {
    if (db.prepare("SELECT id FROM users WHERE email=?").get(email)) throw new AccessError(409, "Korisnik s ovom adresom već postoji. Upotrijebite ponovno slanje pozivnice.");
    const user: PublicUser = { id: randomUUID(), name, email, role, firmId: firm.id, status: "invited", createdAt: iso() };
    db.prepare("INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, NULL, ?)").run(user.id, firm.id, name, email, role, user.status, user.createdAt);
    const invitation = issueInvitation(db, user.id);
    audit(db, actorId, "Korisnik je pozvan", "user", user.id, null, user);
    return { user, ...invitation };
  });
}
export function updateUser(id: string, input: { name?: string; role?: "firm_admin" | "member"; status?: "active" | "disabled"; action?: "invite" | "revoke_invitation" }, actorId: string): { user: PublicUser; token?: string; expiresAt?: string } {
  assertAdmin(actorId);
  return transaction((db) => {
    const before = getUser(id); if (!before) throw new AccessError(404, "Korisnik nije pronađen.");
    if (before.role === "platform_admin") throw new AccessError(403, "LTB administratori ne mijenjaju se ovim putem.");
    const name = input.name === undefined ? before.name : text(input.name, "ime i prezime");
    const role = input.role ?? before.role;
    if (!["firm_admin", "member"].includes(role)) throw new AccessError(400, "Neispravna uloga korisnika.");
    const status = input.action === "invite" && before.status === "disabled" ? "invited" : input.status ?? before.status;
    if (!["invited", "active", "disabled"].includes(status)) throw new AccessError(400, "Neispravan status korisnika.");
    if (status === "active" && !db.prepare("SELECT id FROM users WHERE id=? AND password_hash IS NOT NULL").get(id)) throw new AccessError(400, "Korisnik prvo mora prihvatiti pozivnicu.");
    if (input.action && !["invite", "revoke_invitation"].includes(input.action)) throw new AccessError(400, "Neispravna radnja.");
    db.prepare("UPDATE users SET name=?, role=?, status=? WHERE id=?").run(name, role, status, id);
    if (status !== "active" || role !== before.role) db.prepare("DELETE FROM sessions WHERE user_id=?").run(id);
    if (status === "disabled" || input.action === "revoke_invitation") db.prepare("UPDATE invitations SET revoked_at=? WHERE user_id=? AND used_at IS NULL AND revoked_at IS NULL").run(Date.now(), id);
    const invitation = input.action === "invite" ? issueInvitation(db, id) : {};
    const user = getUser(id)!;
    audit(db, actorId, input.action === "invite" ? "Pozivnica je obnovljena" : input.action === "revoke_invitation" ? "Pozivnica je opozvana" : "Korisnički pristup je promijenjen", "user", id, before, user);
    return { user, ...invitation };
  });
}

export function getInvitationStatus(token: string): { email: string; name: string; firmName: string; expiresAt: string } | null {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = database().prepare("SELECT u.email, u.name, f.name AS firm_name, i.expires_at FROM invitations i JOIN users u ON u.id=i.user_id JOIN firms f ON f.id=u.firm_id WHERE i.token_hash=? AND i.used_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>? AND u.status!='disabled' AND f.status!='suspended'").get(digest(token), Date.now());
  return row ? { email: String(row.email), name: String(row.name), firmName: String(row.firm_name), expiresAt: new Date(Number(row.expires_at)).toISOString() } : null;
}
export function validatePassword(password: unknown): asserts password is string {
  if (typeof password !== "string" || password.length < 12 || password.length > 256) throw new AccessError(400, "Lozinka treba sadržavati od 12 do 256 znakova.");
}
export async function acceptInvitation(token: string, password: string): Promise<PublicUser> {
  validatePassword(password);
  if (!getInvitationStatus(token)) throw new AccessError(400, "Pozivnica je istekla ili više nije valjana. Obratite se LTB administratoru.");
  const encoded = await hashPassword(password);
  return transaction((db) => {
    const row = db.prepare("SELECT i.id, i.user_id FROM invitations i JOIN users u ON u.id=i.user_id JOIN firms f ON f.id=u.firm_id WHERE i.token_hash=? AND i.used_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>? AND u.status!='disabled' AND f.status!='suspended'").get(digest(token), Date.now());
    if (!row) throw new AccessError(400, "Pozivnica više nije valjana.");
    db.prepare("UPDATE users SET password_hash=?, status='active' WHERE id=?").run(encoded, String(row.user_id));
    db.prepare("UPDATE invitations SET used_at=? WHERE id=?").run(Date.now(), String(row.id));
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(String(row.user_id));
    const user = getUser(String(row.user_id))!;
    audit(db, user.id, "Pozivnica je prihvaćena", "user", user.id, null, { status: "active" });
    return user;
  });
}

export function checkLoginThrottle(email: string): void {
  transaction((db) => {
    const now = Date.now(); const window = 15 * 60 * 1000;
    db.prepare("DELETE FROM login_attempts WHERE window_start < ?").run(now - window);
    for (const [key, limit] of [[digest(email.toLowerCase().trim()), 10], ["global", 250]] as const) {
      const row = db.prepare("SELECT attempts FROM login_attempts WHERE key=?").get(key);
      if (row && Number(row.attempts) >= limit) throw new AccessError(429, "Previše pokušaja prijave. Pokušajte ponovno za 15 minuta.");
      db.prepare("INSERT INTO login_attempts VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1").run(key, now);
    }
  });
}
export async function authenticate(email: string, password: string): Promise<Session | null> {
  checkLoginThrottle(email);
  const row = database().prepare("SELECT * FROM users WHERE email=?").get(email.toLowerCase().trim());
  const fallback = "scrypt$32768$8$3$0000000000000000000000000000000000000000000000000000000000000000$" + "0".repeat(128);
  const valid = await verifyPassword(password, row?.password_hash ? String(row.password_hash) : fallback);
  if (!valid || !row) return null;
  const current = database().prepare("SELECT * FROM users WHERE id=? AND password_hash=? AND status='active'").get(String(row.id), String(row.password_hash));
  if (!current) return null;
  const user = userFrom(current);
  const firm = user.firmId ? getFirm(user.firmId) : undefined;
  if (user.role !== "platform_admin" && (!firm || firm.status !== "active")) return null;
  database().prepare("DELETE FROM login_attempts WHERE key=?").run(digest(email.toLowerCase().trim()));
  return { user, firm: firm ?? undefined };
}
export const SESSION_MAX_AGE = 8 * 60 * 60;
export function createSession(userId: string): string {
  const user = getUser(userId);
  if (!user || user.status !== "active" || (user.role !== "platform_admin" && (!user.firmId || getFirm(user.firmId)?.status !== "active"))) throw new AccessError(403, "Pristup ovom računu nije aktivan.");
  const token = randomBytes(32).toString("base64url"); const now = Date.now();
  const db = database(); db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(now);
  db.prepare("INSERT INTO sessions VALUES (?, ?, ?, ?)").run(digest(token), userId, now + SESSION_MAX_AGE * 1000, now);
  return token;
}
export function revokeSession(token: string): void { database().prepare("DELETE FROM sessions WHERE token_hash=?").run(digest(token)); }
export function resolveSession(token: string): Session | null {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const row = database().prepare("SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>? AND u.status='active'").get(digest(token), Date.now());
  if (!row) return null;
  const user = userFrom(row); const firm = user.firmId ? getFirm(user.firmId) : undefined;
  if (user.role !== "platform_admin" && (!firm || firm.status !== "active")) return null;
  return { user, firm: firm ?? undefined };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
  validatePassword(newPassword);
  if (typeof currentPassword !== "string" || currentPassword.length > 256) throw new AccessError(400, "Unesite trenutačnu lozinku.");
  const row = database().prepare("SELECT password_hash, email FROM users WHERE id=? AND status='active'").get(userId);
  if (!row?.password_hash) throw new AccessError(401, "Prijavite se ponovno.");
  checkLoginThrottle(String(row.email));
  if (!(await verifyPassword(currentPassword, String(row.password_hash)))) throw new AccessError(400, "Trenutačna lozinka nije ispravna.");
  const encoded = await hashPassword(newPassword);
  transaction((db) => {
    const result = db.prepare("UPDATE users SET password_hash=? WHERE id=? AND password_hash=? AND status='active'").run(encoded, userId, String(row.password_hash));
    if (Number(result.changes) !== 1) throw new AccessError(409, "Račun je promijenjen. Prijavite se ponovno.");
    db.prepare("DELETE FROM sessions WHERE user_id=?").run(userId);
    db.prepare("UPDATE invitations SET revoked_at=? WHERE user_id=? AND used_at IS NULL AND revoked_at IS NULL").run(Date.now(), userId);
    db.prepare("DELETE FROM login_attempts WHERE key=?").run(digest(String(row.email).toLowerCase().trim()));
    audit(db, userId, "Lozinka je promijenjena", "user", userId, null, null);
  });
}

/** Transitional firm-scoped JSON, with compare-and-swap to reject stale writes. */
export function readFirmData(firmId: string): { data: DB; revision: number } | null {
  const row = database().prepare("SELECT payload, revision FROM firm_data WHERE firm_id=?").get(firmId);
  return row ? { data: JSON.parse(String(row.payload)) as DB, revision: Number(row.revision) } : null;
}
export function writeFirmData(firmId: string, data: DB, expectedRevision: number): number {
  if (data.firm.id !== firmId) throw new AccessError(403, "Podaci ne pripadaju ovom uredu.");
  return transaction((db) => commitFirmData(db, firmId, data, expectedRevision));
}
function commitFirmData(db: DatabaseSync, firmId: string, data: DB, expectedRevision: number): number {
  if (data.firm.id !== firmId) throw new AccessError(403, "Podaci ne pripadaju ovom uredu.");
  const now = iso();
  const result = expectedRevision === 0
    ? db.prepare("INSERT INTO firm_data (firm_id,payload,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(firm_id) DO NOTHING").run(firmId, JSON.stringify(data), now)
    : db.prepare("UPDATE firm_data SET payload=?, revision=revision+1, updated_at=? WHERE firm_id=? AND revision=?").run(JSON.stringify(data), now, firmId, expectedRevision);
  if (Number(result.changes) !== 1) throw new AccessError(409, "Podaci su upravo promijenjeni. Osvježite stranicu i pokušajte ponovno.");
  return expectedRevision + 1;
}
export interface ProcessingJob { id: string; firmId: string; documentId: string; mode: AnalysisMode; features: FeatureKey[]; status: "pending" | "complete" | "failed"; createdAt: string }
function validateJobFirm(firmId: string, mode: AnalysisMode): FirmRecord {
  if (mode !== "sazetak" && mode !== "detaljna") throw new AccessError(400, "Nepoznata vrsta obrade.");
  const firm = getFirm(firmId);
  if (!firm || firm.status !== "active" || !hasFeature(firm, mode === "sazetak" ? "summary_analysis" : "detailed_analysis")) throw new AccessError(403, "Ova obrada nije dostupna uredu.");
  return firm;
}
function insertJob(db: DatabaseSync, jobId: string, firm: FirmRecord, documentId: string, mode: AnalysisMode): void {
  db.prepare("INSERT INTO processing_jobs (id,firm_id,document_id,mode,features,status,created_at) VALUES (?,?,?,?,?,'pending',?)").run(jobId, firm.id, documentId, mode, JSON.stringify(firm.features), iso());
}
export function registerJob(jobId: string, firmId: string, documentId: string, mode: AnalysisMode): void {
  transaction((db) => {
    const firm = validateJobFirm(firmId, mode);
    const data = readFirmData(firmId);
    if (!data?.data.documents.some((document) => document.id === documentId)) throw new AccessError(404, "Dokument nije pronađen.");
    insertJob(db, jobId, firm, documentId, mode);
  });
}
/** Persist the pending analysis and its callback ownership together, or neither. */
export function writeFirmDataAndRegisterJob(firmId: string, data: DB, expectedRevision: number, jobId: string, documentId: string, mode: AnalysisMode): number {
  return transaction((db) => {
    const firm = validateJobFirm(firmId, mode);
    const document = data.documents.find((entry) => entry.id === documentId);
    if (!document) throw new AccessError(404, "Dokument nije pronađen.");
    if (!document.analyses.some((analysis) => analysis.jobId === jobId && analysis.mode === mode && analysis.status === "u_obradi")) throw new AccessError(400, "Nedostaje obrada dokumenta.");
    const revision = commitFirmData(db, firmId, data, expectedRevision);
    insertJob(db, jobId, firm, documentId, mode);
    return revision;
  });
}
export function getJob(jobId: string): ProcessingJob | null {
  const row = database().prepare("SELECT * FROM processing_jobs WHERE id=?").get(jobId);
  return row ? { id: String(row.id), firmId: String(row.firm_id), documentId: String(row.document_id), mode: row.mode as AnalysisMode, features: JSON.parse(String(row.features)), status: row.status as ProcessingJob["status"], createdAt: String(row.created_at) } : null;
}
export function completeJob(jobId: string, status: "complete" | "failed" = "complete"): void {
  database().prepare("UPDATE processing_jobs SET status=?, completed_at=? WHERE id=? AND status='pending'").run(status, iso(), jobId);
}
