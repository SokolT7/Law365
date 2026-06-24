# LTBLaw — demo

AI sustav za pregled ugovora i pravnu podršku za **hrvatska odvjetnička društva**.
Demo prikazuje: nadzornu ploču, učitavanje i analizu ugovora, pregled rizika prema
standardima ureda, pitanja i odgovore s navedenim izvorom te revizijski trag.

> Zaglavlje: **LTBLaw × [odvjetničko društvo]** · sučelje na hrvatskom · sintetički podaci (bez stvarnih klijenata).

## Pokretanje

```bash
cd ltblaw
npm install
copy .env.example .env      # (Windows)   ili: cp .env.example .env
npm run dev                 # http://localhost:3000
```

Baza se automatski puni sintetičkim ugovorima pri prvom pokretanju.

### Demo način vs. Aktivni (Live) način

- **Bez ključa → Demo način:** analiza je deterministička (temeljena na pravilima ureda),
  pretraživanje i citati su stvarni. Uvijek radi, idealno za prezentaciju.
- **S ključem → Aktivni način:** postavite `ANTHROPIC_API_KEY` u `.env` i Claude preuzima
  sažetke i odgovore. Zadani model: `claude-opus-4-8` (promjenjivo putem `LTBLAW_MODEL`).

## Demo scenarij (5 koraka)

1. **Učitajte ugovor** (Dokumenti) — klasifikacija, sažetak i ključni uvjeti u stvarnom vremenu.
2. **Otvorite Provjeru ugovora** — rizici označeni prema standardima ureda, svaki vezan uz klauzulu.
3. **Postavite pitanje** (Pitanja i odgovori) — odgovor s navedenim izvorom iz dokumenata.
4. **Odobrite nalaz** — radnja se bilježi u Zapisnik aktivnosti.
5. **Nadzorna ploča** — izloženost riziku, rokovi i status dokumenata na jednom mjestu.

## Tehnologija

Next.js 15 (App Router, TypeScript) · lokalna JSON pohrana · leksičko pretraživanje (RAG) ·
`@anthropic-ai/sdk` (Claude). Cjevovod obrade (`src/lib/ingest`) napravljen je tako da se u
produkciji jednostavno zamijeni **n8n** tokom, JSON pohrana **PostgreSQL-om + pgvector**, a
leksičko pretraživanje **embeddinzima**.
