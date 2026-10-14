import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const PARAMETERS = { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 };

/** @param {string} password */
export async function hashPassword(password) {
  const salt = randomBytes(32).toString("hex");
  const derived = /** @type {Buffer} */ (await scrypt(password, salt, 64, PARAMETERS));
  return `scrypt$32768$8$3$${salt}$${derived.toString("hex")}`;
}

/** @param {string} password @param {string} encoded */
export async function verifyPassword(password, encoded) {
  const parts = encoded.split("$");
  const modern = parts.length === 6;
  const [algorithm, salt, digest] = modern ? [parts[0], parts[4], parts[5]] : parts;
  if (algorithm !== "scrypt" || !salt || !digest || !/^[a-f0-9]{128}$/.test(digest)) return false;
  if (modern && parts.slice(1, 4).join("$") !== "32768$8$3") return false;
  const actual = /** @type {Buffer} */ (await scrypt(password, salt, 64, modern ? PARAMETERS : { N: 16384, r: 8, p: 1 }));
  return timingSafeEqual(actual, Buffer.from(digest, "hex"));
}

export const PLATFORM_SCHEMA = `
CREATE TABLE IF NOT EXISTS firms (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, legal_name TEXT NOT NULL,
  accent TEXT NOT NULL, greeting TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft','active','suspended')),
  features TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, firm_id TEXT REFERENCES firms(id),
  name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role TEXT NOT NULL CHECK(role IN ('platform_admin','firm_admin','member')),
  status TEXT NOT NULL CHECK(status IN ('invited','active','disabled')),
  password_hash TEXT, created_at TEXT NOT NULL,
  CHECK ((role = 'platform_admin' AND firm_id IS NULL) OR (role != 'platform_admin' AND firm_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS users_firm ON users(firm_id);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY, token_hash TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL,
  used_at INTEGER, revoked_at INTEGER, created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS invitations_user ON invitations(user_id);
CREATE TABLE IF NOT EXISTS platform_audit (
  id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL,
  target_type TEXT NOT NULL, target_id TEXT NOT NULL,
  before_json TEXT, after_json TEXT, created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS firm_data (
  firm_id TEXT PRIMARY KEY REFERENCES firms(id), payload TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS processing_jobs (
  id TEXT PRIMARY KEY, firm_id TEXT NOT NULL REFERENCES firms(id), document_id TEXT NOT NULL,
  mode TEXT NOT NULL CHECK(mode IN ('sazetak','detaljna')),
  features TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','complete','failed')),
  created_at TEXT NOT NULL, completed_at TEXT
);
CREATE INDEX IF NOT EXISTS jobs_firm ON processing_jobs(firm_id);
CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, window_start INTEGER NOT NULL
);
`;
