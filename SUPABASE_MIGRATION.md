# Production Upgrade — Supabase Persistence & Multi-User Auth

> **Status:** Planned. **Do NOT implement in the demo phase.**
> The demo runs on the current Upstash KV store (single JSON blob, key `ltblaw:db:v3`)
> with local-file fallback. This document is the blueprint for the **production phase**,
> when documents + full conversations must be stored durably, securely, and per-firm.
>
> **Driving directive:** security-first — no data leaks, no cross-tenant access, GDPR-aligned.
> **Auth target (decided 2026-06-30):** full multi-user login from day one.

---

## 1. Why migrate

The KV blob is fine for a single-user demo but wrong for production:

| Need | KV blob today | Supabase |
|---|---|---|
| Many documents + long conversations | One growing JSON value (size/concurrency limits) | Relational rows, indexed |
| Tenant isolation (firm A can't see firm B) | None — app-code only | **Row-Level Security at the DB** |
| Real login / roles | None | Supabase Auth |
| Store the original PDF/DOCX | Not stored (only parsed text) | Private Storage buckets |
| Semantic retrieval (fewer wrong answers) | Lexical keyword match | **pgvector** similarity |
| GDPR data residency | n/a | EU (Frankfurt) region |
| Backups / recovery | n/a | PITR on paid tiers |

**In-tenant option (confidentiality wedge):** because the product is bespoke, the *firm* can
own the Supabase project + the Anthropic + embeddings accounts, so client data never leaves
their controlled environment. Keep this configurable.

---

## 2. Target architecture

```
Browser (anon key + user JWT, RLS-constrained)
   │
Next.js (Vercel)
   ├─ Server Components / API routes
   │     ├─ user session client  → RLS-enforced reads/writes
   │     └─ service-role client   → trusted tasks only (n8n callback, embeddings)
   ├─ Supabase Postgres  (documents, messages, chunks+pgvector, analyses, audit, …)
   ├─ Supabase Storage   (private bucket: original files, signed URLs)
   └─ n8n (deep Sažetak/Detaljna) ── shared secret ──┘
Anthropic (chat + analysis, no-train)   Voyage/OpenAI (embeddings, server-side only)
```

Region: **EU Central (Frankfurt)** — set at project creation, cannot be changed later.

---

## 3. Data model (SQL)

```sql
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists vector;     -- pgvector

-- Tenants
create table firms (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  oib         text,
  created_at  timestamptz not null default now()
);

-- Identity = Supabase auth.users; membership ties a user to a firm + role
create table memberships (
  user_id     uuid not null references auth.users(id) on delete cascade,
  firm_id     uuid not null references firms(id) on delete cascade,
  role        text not null default 'lawyer' check (role in ('owner','lawyer','staff')),
  created_at  timestamptz not null default now(),
  primary key (user_id, firm_id)
);

create table clients (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  name text not null, oib text,
  created_at timestamptz not null default now()
);

create table matters (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  client_id uuid references clients(id) on delete set null,
  title text not null,
  created_at timestamptz not null default now()
);

create table documents (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  owner_id uuid not null references auth.users(id),
  title text not null,
  type text,
  client_id uuid references clients(id) on delete set null,
  matter_id uuid references matters(id) on delete set null,
  created_at timestamptz not null default now()
);

create table document_files (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  firm_id uuid not null references firms(id) on delete cascade,
  filename text not null,
  storage_path text not null,   -- 'firm_id/document_id/filename'
  byte_size bigint,
  created_at timestamptz not null default now()
);

create table chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  firm_id uuid not null references firms(id) on delete cascade,
  heading text,
  text text not null,
  embedding vector(1024),       -- dim MUST match the embedding model (voyage-3 = 1024)
  created_at timestamptz not null default now()
);
create index chunks_embedding_idx on chunks
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index chunks_doc_idx on chunks(document_id);

create table messages (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  firm_id uuid not null references firms(id) on delete cascade,
  author_id uuid references auth.users(id),
  role text not null check (role in ('user','assistant')),
  text text not null,
  citations jsonb,
  has_image boolean not null default false,
  created_at timestamptz not null default now()
);
create index messages_doc_idx on messages(document_id, created_at);

create table analyses (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  firm_id uuid not null references firms(id) on delete cascade,
  mode text not null check (mode in ('sazetak','detaljna')),
  status text not null default 'u_obradi' check (status in ('u_obradi','analizirano','greska')),
  job_id text,
  result jsonb,
  error text,
  created_at timestamptz not null default now(),
  unique (document_id, mode)
);

create table source_settings (
  firm_id uuid primary key references firms(id) on delete cascade,
  sources jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references firms(id) on delete cascade,
  user_id uuid references auth.users(id),
  action text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index audit_firm_idx on audit_log(firm_id, created_at);
```

**Note:** the demo parses uploads in memory and stores only chunks. Production must persist the
**original file** to Storage at upload time (`document_files.storage_path`).

---

## 4. Row-Level Security (the core of the security posture)

Deny-by-default; every table scoped by `firm_id` via membership.

```sql
create or replace function is_member(f uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from memberships m
    where m.firm_id = f and m.user_id = auth.uid()
  );
$$;

-- Apply to every firm-scoped table (documents shown; repeat for the rest):
alter table documents enable row level security;
create policy doc_sel on documents for select using (is_member(firm_id));
create policy doc_ins on documents for insert with check (is_member(firm_id));
create policy doc_upd on documents for update using (is_member(firm_id)) with check (is_member(firm_id));
create policy doc_del on documents for delete using (is_member(firm_id));

-- memberships: a user sees only their own membership rows
alter table memberships enable row level security;
create policy mem_self on memberships for select using (user_id = auth.uid());
```

Repeat the four policies for `document_files`, `chunks`, `messages`, `analyses`,
`source_settings`, `audit_log`, `clients`, `matters`.

**Storage RLS** (private bucket `documents`, path `firm_id/document_id/filename`):

```sql
create policy "firm reads own files" on storage.objects for select
  using (bucket_id = 'documents' and is_member((storage.foldername(name))[1]::uuid));
create policy "firm writes own files" on storage.objects for insert
  with check (bucket_id = 'documents' and is_member((storage.foldername(name))[1]::uuid));
```

Files are **never public** — serve via short-lived **signed URLs** generated server-side.

---

## 5. Auth (full multi-user, decided target)

- **Supabase Auth** with email/password (+ optional magic link / SSO later).
- `@supabase/ssr` for the App Router: middleware refreshes the session cookie; server
  components use `createServerClient`, the browser uses the anon key.
- **Onboarding:** create `firms` row → `memberships` row (`role='owner'`). Owners invite
  colleagues (creates `memberships` with `lawyer`/`staff`).
- **Roles:** `owner` (manage firm + members + sources), `lawyer` (full document access),
  `staff` (configurable). Enforce role-gated actions in API routes *and* via RLS where possible.
- Protect all `/dokumenti`, `/izvori`, `/pitanja`, `/zapisnik` routes behind an authenticated session.

---

## 6. Retrieval upgrade (pgvector)

Replace lexical `searchChunks` with a SQL similarity RPC:

```sql
create or replace function match_chunks(query_embedding vector(1024), f uuid, k int)
returns table (id uuid, document_id uuid, heading text, text text, score float)
language sql stable as $$
  select c.id, c.document_id, c.heading, c.text,
         1 - (c.embedding <=> query_embedding) as score
  from chunks c
  where c.firm_id = f
  order by c.embedding <=> query_embedding
  limit k;
$$;
```

- **Embeddings provider:** Anthropic has no embeddings endpoint. Use **Voyage AI**
  (Anthropic's recommended partner) — `voyage-3` (1024-dim, multilingual, good for Croatian)
  or `voyage-law-2` (legal-domain). Alternative: OpenAI `text-embedding-3-small` (1536-dim →
  change `vector(1536)`). **Dim must match the column.**
- Generate embeddings **server-side only**; the embedding API key is a server env var.
- Keep the strict-grounding rule: only pass chunks above a score threshold; if none, the AI
  must answer *"To nije navedeno u dostupnim dokumentima"* (already enforced in `chat.ts`).

---

## 7. Code migration map

| Area | Current | Production |
|---|---|---|
| `src/lib/db.ts` | `readDB/writeDB` on one KV blob | Data-access layer per table (`src/lib/db/supabase.ts`); keep a thin interface so KV (demo) and Supabase (prod) are swappable behind `STORAGE=kv\|supabase` |
| `src/lib/retrieval/search.ts` | lexical scoring | call `match_chunks` RPC with a query embedding |
| `/api/documents` (upload) | parse → chunk → KV | upload original to Storage, insert `documents`+`document_files`, embed + insert `chunks` |
| `/api/documents/[id]/files` | append chunks to KV | same, Supabase |
| `/api/chat` | read/append `conversation` on doc | read `messages`, insert user+assistant rows; sources from `source_settings` (already server-authoritative) |
| `/api/documents/[id]` (POST), `/api/n8n/callback` | analyses on doc | `analyses` table; callback uses **service-role** client (resolve by `job_id`) |
| `/api/sources` | KV settings | `source_settings` upsert |
| Auth | none | `@supabase/ssr` middleware + login |

**Two Supabase clients:**
- *user session client* (anon key + JWT) → all user-facing reads/writes, RLS-enforced.
- *service-role client* → **only** trusted server tasks (n8n callback writing results,
  embedding generation). Never reachable from the browser.

---

## 8. Environment variables (production)

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...        # browser-safe; RLS protects data
SUPABASE_SERVICE_ROLE_KEY=...            # SERVER ONLY — never NEXT_PUBLIC_
VOYAGE_API_KEY=...                       # (or OPENAI_API_KEY) embeddings, server only
ANTHROPIC_API_KEY=...                    # chat (server only) — already in use
N8N_WEBHOOK_SAZETAK=... / N8N_WEBHOOK_DETALJNA=...
N8N_SHARED_SECRET=...                    # rotate on schedule
APP_BASE_URL=...
```

---

## 9. Migration steps (phased)

0. **Provision** — Supabase project in EU/Frankfurt; enable `vector`; run the schema + RLS SQL;
   create private `documents` bucket + storage policies.
1. **Auth** — add `@supabase/ssr`, login + middleware, firm/membership onboarding + invites.
2. **Data layer** — implement Supabase data-access behind the existing db interface; flag `STORAGE=supabase`.
3. **Files + retrieval** — persist originals to Storage; embed chunks; swap retrieval to `match_chunks`.
4. **Data import** — one-time script: read KV `ltblaw:db:v3` → insert into tables (originals likely absent in old demo data; re-upload as needed).
5. **Cutover** — disable KV; verify.

---

## 10. Security checklist (acceptance gate)

- [ ] Project in **EU/Frankfurt**; pgvector enabled.
- [ ] **RLS enabled on every firm-scoped table**, deny-by-default, `firm_id` via `is_member()`.
- [ ] **Cross-tenant test:** user of firm B querying firm A's documents returns **0 rows** (the must-pass test).
- [ ] Storage bucket **private**; access only via server-generated **signed URLs**.
- [ ] Service-role key **server-side only**; browser uses anon key + JWT.
- [ ] All secrets server-side (no `NEXT_PUBLIC_` on keys); rotation schedule for n8n + service keys.
- [ ] **Audit log** written on document access, question, and analysis (who/what/when).
- [ ] Model receives **only relevant chunks**, not whole documents, where feasible.
- [ ] Anthropic + embeddings on **no-train**; document the data flow for the firm.
- [ ] PITR/backups enabled; restore tested.
- [ ] Optional in-tenant mode: firm owns Supabase + API accounts.

---

## 11. Acceptance criteria

- A user logs in, sees only their firm's documents, opens one, and **the full past
  conversation loads** from `messages`.
- Uploading stores the **original file** + chunks + embeddings; retrieval is semantic.
- A second firm's account **cannot** read the first firm's rows or files (RLS verified).
- Sažetak/Detaljna persist in `analyses` and survive reload.
- No key or service credential is exposed to the browser.
