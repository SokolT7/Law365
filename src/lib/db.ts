import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Redis } from "@upstash/redis";
import type { AuditEvent, DB } from "@/lib/types";
import { buildSeedDB } from "@/lib/seed/seed";

const KEY = "ltblaw:db:v3";
const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

/** KV vjerodajnice (Vercel/Upstash) — podržava oba imenovanja env varijabli. */
function kv(): Redis | null {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

/** Čita bazu; pri prvom pokretanju je sije sintetičkim podacima.
 *  Koristi KV kad su env varijable prisutne (Vercel), inače lokalnu datoteku. */
export async function readDB(): Promise<DB> {
  const client = kv();
  if (client) {
    const existing = (await client.get<DB>(KEY)) ?? null;
    if (existing) return existing;
    const seeded = buildSeedDB();
    await client.set(KEY, seeded);
    return seeded;
  }
  // lokalni fallback (datoteka)
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DB_FILE)) {
    const seeded = buildSeedDB();
    fs.writeFileSync(DB_FILE, JSON.stringify(seeded, null, 2), "utf8");
    return seeded;
  }
  return JSON.parse(fs.readFileSync(DB_FILE, "utf8")) as DB;
}

export async function writeDB(db: DB): Promise<void> {
  const client = kv();
  if (client) {
    await client.set(KEY, db);
    return;
  }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

export async function resetDB(): Promise<DB> {
  const seeded = buildSeedDB();
  await writeDB(seeded);
  return seeded;
}

/** Dodaje zapis u revizijski trag (mutira objekt u memoriji; pozivatelj poslije sprema). */
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
