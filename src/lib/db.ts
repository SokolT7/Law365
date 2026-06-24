import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import type { AuditEvent, DB } from "@/lib/types";
import { buildSeedDB } from "@/lib/seed/seed";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

/** Čita bazu; pri prvom pokretanju automatski je sije sintetičkim podacima. */
export function readDB(): DB {
  ensureDir();
  if (!fs.existsSync(DB_FILE)) {
    const seeded = buildSeedDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), "utf8");
    return seeded;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as DB;
}

export function writeDB(db: DB): void {
  ensureDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

/** Ponovno sije bazu (gumb „Ponovno učitaj demo”). */
export function resetDB(): DB {
  ensureDir();
  const seeded = buildSeedDB();
  fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), "utf8");
  return seeded;
}

export function addAudit(db: DB, action: string, target: string): void {
  const event: AuditEvent = {
    id: randomUUID(),
    ts: new Date().toISOString(),
    actor: db.user.name,
    action,
    target,
  };
  db.audit.unshift(event);
}
