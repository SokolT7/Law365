// Shared by the app (src/lib/legal/store.ts) and the ingestion job (scripts/ingest-legal.mjs).
// Public law only: no firm data is ever written to the legal store.
export const LEGAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS legal_acts (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,          -- catalogue id: rh-zakoni | rh-praksa | eu-propisi
  title TEXT NOT NULL,
  short TEXT,
  citation TEXT,                 -- e.g. "NN 93/14" or "CELEX 32016R0679"
  url TEXT,
  version_note TEXT,             -- what text this is (original, consolidated, …)
  amendments TEXT NOT NULL DEFAULT '[]',
  fetched_at TEXT NOT NULL,
  unit_count INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS legal_units (
  rowid INTEGER PRIMARY KEY,
  id TEXT UNIQUE NOT NULL,
  act_id TEXT,
  source TEXT NOT NULL,
  kind TEXT NOT NULL,            -- statute | case | eu
  title TEXT NOT NULL,
  short TEXT,
  ref TEXT,                      -- "Članak 116." or case number
  heading TEXT,                  -- article title or subject index
  text TEXT NOT NULL,
  url TEXT,
  ecli TEXT,
  court TEXT,
  decided_at TEXT,
  decision_type TEXT,
  registry TEXT,
  keywords TEXT,
  statutes TEXT,
  amended_by TEXT,               -- JSON array of amending acts that mention this article
  fetched_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS legal_units_act ON legal_units(act_id);
CREATE INDEX IF NOT EXISTS legal_units_short_ref ON legal_units(short, ref);
CREATE VIRTUAL TABLE IF NOT EXISTS legal_fts USING fts5(
  title, ref, heading, keywords, text,
  content='legal_units', content_rowid='rowid',
  tokenize='unicode61 remove_diacritics 2'
);
CREATE TRIGGER IF NOT EXISTS legal_units_ai AFTER INSERT ON legal_units BEGIN
  INSERT INTO legal_fts(rowid, title, ref, heading, keywords, text) VALUES (new.rowid, new.title, new.ref, new.heading, new.keywords, new.text);
END;
CREATE TRIGGER IF NOT EXISTS legal_units_ad AFTER DELETE ON legal_units BEGIN
  INSERT INTO legal_fts(legal_fts, rowid, title, ref, heading, keywords, text) VALUES ('delete', old.rowid, old.title, old.ref, old.heading, old.keywords, old.text);
END;
`;

// Columns added after the first release (applied with ALTER TABLE when missing).
export const LEGAL_MIGRATIONS = [
  "ALTER TABLE legal_units ADD COLUMN original_text TEXT",
  "ALTER TABLE legal_units ADD COLUMN consolidation TEXT",
];
export function migrateLegal(db) {
  const columns = new Set(db.prepare("PRAGMA table_info(legal_units)").all().map((c) => c.name));
  for (const sql of LEGAL_MIGRATIONS) {
    const column = sql.match(/ADD COLUMN (\w+)/)[1];
    if (!columns.has(column)) db.exec(sql);
  }
}
