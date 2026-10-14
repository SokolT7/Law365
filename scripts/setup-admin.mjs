#!/usr/bin/env node
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, chmodSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import readline from "node:readline/promises";
import { PLATFORM_SCHEMA, hashPassword } from "../src/lib/platform-core.mjs";

if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) throw new Error("A persistent single-host disk is required.");
if (!process.stdin.isTTY) throw new Error("Pokrenite postavljanje u interaktivnom terminalu. Lozinka se ne prima kroz argumente.");
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const email = (await rl.question("E-pošta LTB administratora: ")).trim().toLowerCase();
const name = (await rl.question("Ime i prezime: ")).trim();
rl.close();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || !name || name.length > 160) throw new Error("Unesite valjano ime i e-poštu.");

function secret(prompt) {
  return new Promise((resolve, reject) => {
    process.stdout.write(prompt); process.stdin.setRawMode(true); process.stdin.resume();
    let value = "";
    const onData = (buffer) => {
      for (const char of buffer.toString("utf8")) {
        if (char === "\u0003") { cleanup(); reject(new Error("Postavljanje je prekinuto.")); return; }
        if (char === "\r" || char === "\n") { cleanup(); resolve(value); return; }
        if (char === "\u007f" || char === "\b") value = value.slice(0, -1);
        else if (char >= " " && value.length < 257) value += char;
      }
    };
    function cleanup() { process.stdin.off("data", onData); process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write("\n"); }
    process.stdin.on("data", onData);
  });
}
const password = await secret("Lozinka (najmanje 12 znakova, unos je skriven): ");
const confirmation = await secret("Ponovite lozinku: ");
if (password !== confirmation || password.length < 12 || password.length > 256) throw new Error("Lozinke moraju biti jednake i sadržavati od 12 do 256 znakova.");
const passwordHash = await hashPassword(password);
const filename = process.env.LTB_DATABASE_PATH || path.join(process.cwd(), "data", "platform.sqlite");
mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(filename);
db.exec("PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;");
db.exec(PLATFORM_SCHEMA);
chmodSync(filename, 0o600);
db.exec("BEGIN IMMEDIATE");
try {
  if (db.prepare("SELECT id FROM users WHERE role='platform_admin' LIMIT 1").get()) throw new Error("LTB administrator već postoji. Ova naredba služi samo za prvo postavljanje.");
  const id = randomUUID(); const now = new Date().toISOString();
  db.prepare("INSERT INTO users VALUES (?, NULL, ?, ?, 'platform_admin', 'active', ?, ?)").run(id, name, email, passwordHash, now);
  db.prepare("INSERT INTO platform_audit VALUES (?, ?, 'Prvi LTB administrator je postavljen', 'user', ?, NULL, ?, ?)").run(randomUUID(), id, id, JSON.stringify({ role: "platform_admin" }), now);
  db.exec("COMMIT");
  console.log("LTB administrator je postavljen. Prijavite se putem /prijava.");
} catch (error) { db.exec("ROLLBACK"); throw error; }
finally { db.close(); }
