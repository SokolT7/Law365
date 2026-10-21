# LTB Law: Simplification Plan

**Status:** Step 1 of 7 done (menu and top bar). All three decisions in §9 approved on 15 October 2026.
**Date:** 15 October 2026
**Scope:** The firm workspace (every screen a lawyer sees after signing in). LTB administration (`/admin`) is out of scope for now, but the same rules will apply to it later.
**Relation to earlier plans:** `UX_Redesign.md` added power-user tools: the ⌘K palette, keyboard shortcuts, grouped navigation, and evidence panels. This plan keeps every one of them working but takes most of them **off the screen**.

---

## 1. The brief, in your words

This is quoted exactly as you typed it. Every decision below has to be checked against it.

> The UI feels too cramped up and too much text and information everywhere. The key is simplicity. The user doesn't need to have absolutely every feature and explanation on the page that is opened. You need to compact it a bit so that there is room on the screen. Right now I feel overwhelmed while going through LTB Law. There is too much of everything.
>
> Let's cut it down so that the user doesn't feel overwhelmed. Less buttons, less text, less information, simpler navigation, a granny could navigate through the project easily.

### What each phrase means for the design

| You said | So we will |
| --- | --- |
| "too cramped up and too much text and information everywhere" | Remove things rather than squeeze them closer together. White space is the result, not the goal. |
| "The key is simplicity." | Give every screen one job and one main (blue) button. |
| "The user doesn't need to have absolutely every feature and explanation on the page that is opened." | Move features that aren't needed right now behind one click: a menu, a "Više" link, or **Postavke**. Delete explanations instead of moving them. Moving a feature is different from deleting it (see §6). |
| "compact it a bit so that there is room on the screen" | **"Compact" means fewer things, not smaller things.** Text and buttons do not get smaller. The room comes from what we take away. |
| "I feel overwhelmed … There is too much of everything." | Use a 3-second test: on first look at any screen, you can say what it's for and what to click. |
| "Less buttons, less text, less information" | Set measurable targets for every screen (§7). |
| "simpler navigation" | Show 5 menu items plus Postavke, down from 9 items under 4 group labels. |
| "a granny could navigate through the project easily" | Use plain words, large clear targets, and a visible way back on every inner page. Nothing should be reachable *only* through a keyboard shortcut. |

---

## 2. What's overwhelming today

These measurements come from the running demo at 1440×900 on 15 October 2026. The demo holds only 3 documents and 1 client. A real firm has hundreds, so lists get longer while the clutter around them stays, and the clutter matters even more.

| Screen | Words on screen (incl. menu) | Clickable things | Page height |
| --- | --- | --- | --- |
| Menu (on every page) | 47 | 14 | — |
| Početna (`/`) | 201 | 34 | 1044 px (scrolls) |
| Pravna pitanja (empty) | 265 | 39 | 900 px |
| Document page | 763 (after one answer) | 42 | 900 px |
| Provjera ugovora (one contract open) | 657 | 71 | **2628 px** (3 screens) |
| Izvori prava | 336 | 30 | 1911 px |
| Asistenti | 340 | 25 | 1107 px |

### The same thing shown more than once

- **Upload** can be started in **8 ways**: the header button, Novo → Učitaj dokument, Novo → Nova provjera ugovora, Provjera → Novi ugovor, the mobile header icon, the mobile Početna button, drag-and-drop, and the `U` key. Two or three of these are visible at the same time.
- **Source settings** appear in **3 places**: the header dropdown "Izvori prava 7", the composer chip "Izvori 7/7", and the Izvori prava page.
- **Deadlines** appear **twice** on Početna, under "Za vas danas" and again under "Datumi i rokovi".
- **Regulation changes** are counted **3 times**: in a number tile, in a menu badge, and in the bell.
- **A failed document** is listed **twice** on Početna, once for "Sažetak" and once for "Detaljna analiza".
- **The document title** appears **twice** on the document page, in the breadcrumb and in the heading.
- **Contracts are listed in two places**: Dokumenti, and the left column of Provjera ugovora.
- **Two search boxes** sit near the top of Početna: "Pretraži ili skoči…" and "Što želite istražiti?".

### Text nobody needs to read

- Every page has a subtitle sentence under its title, for example: *"Provjera prema predlošcima za vrstu ugovora i pravilima ureda — svaki nalaz navodi odlomak i pravni temelj"*.
- Keyboard hints are printed in the interface: `⌘K`, `↵ pošalji · ⇧↵ novi red`, and `U` in menus.
- Technical detail is shown up front: CELEX numbers, "3.005 članaka · ažurirano prije 3 sata", "Pretraženo 7 izvora · 9 pronađenih odlomaka", "Citati provjereni · 9/9 izvora korišteno", and the timezone label "Europe/Zagreb".
- Raw AI instructions appear on every Asistent card, about 40 words each.
- Six sources marked "Nije povezano" are listed even though they can't be used.
- "Analizirano" badges appear everywhere, although that is the normal state.

### Text that is too small

Two-thirds of all text styles in `globals.css` are 12–13 px (201 of about 300), and body text is 14 px. That is hard to read during long sessions and harder still for the "granny" test.

### Mobile

On a 375×812 phone, the top bar, the page header, and the tab bar take **258 px (32 %)** before any content appears. Upload shows twice on Početna, as a header icon and as a full-width button.

### Bug found during the walkthrough

In the client filter on **Propisi**, the internal placeholder client "Ručno učitani dokument" is listed twice. It should not be listed at all.

---

## 3. Rules for every screen

1. **One main button per screen.** Only one button is blue. Everything else is a quiet text link or sits in a "⋯" menu.
2. **No subtitles under page titles.** If a page needs a sentence to explain itself, fix the page instead.
3. **At most one short helper line per screen**, placed next to the thing it helps and only where the next step would otherwise be unclear.
4. **No visible keyboard hints.** Shortcuts and ⌘K keep working, and the list of shortcuts lives in the profile menu → *Prečaci tipkovnice*.
5. **Say it once.** No number, list, or control appears twice on the same screen.
6. **Show a status only when it needs action.** Use "U obradi" and "Greška". "Analizirano" is the normal state and gets no badge.
7. **Plain words.** The menu reads Početna, Dokumenti, Klijenti, Pitanja, Propisi, Postavke.
8. **Advanced settings live in Postavke:** sources, assistants, review templates, the activity log, and the account.
9. **Compact doesn't mean small.** Body text is at least 15 px, secondary text at least 13 px, and buttons at least 40 px tall (44 px on touch).
10. **There is always a way back.** Every inner page has a "← Dokumenti"-style link at the top left in place of breadcrumbs.
11. **Show details on demand.** Technical detail such as counts, codes, and dates stays behind a "Detalji" or "▸" toggle.

---

## 4. Navigation

### Menu: before and after

```
BEFORE (14 controls, 47 words)        AFTER (7 controls, ~10 words)

LTB Law                    [◧]        LTB Law
┌ Radni prostor ureda      ┐
│ Kovač & partneri · DEMO  │            Početna
└──────────────────────────┘            Dokumenti
┌ Klijent: Svi klijenti  ▾ ┐            Klijenti
└──────────────────────────┘            Pitanja
[ + Novo                   ]            Propisi        3
PREGLED
  Radni prostor                         ─────────
RAD S DOKUMENTIMA                       Postavke
  Dokumenti                             (N) Ana Kovač ▾
  Klijenti
  Provjera ugovora
PRAVNO ISTRAŽIVANJE
  Pravna pitanja
  Praćenje propisa
  Asistenti
URED
  Izvori prava
  Zapisnik aktivnosti
🔒 Pristup po odobrenju
(N) Ana Kovač  ▾
```

| Today | After | Why |
| --- | --- | --- |
| 4 group labels | Removed | Five items don't need grouping. |
| Firm card ("Radni prostor ureda · Kovač & partneri") | Moved to the top of the profile menu | The user already knows which firm they work for. |
| "🔒 Pristup po odobrenju" | Removed | It tells the user nothing they can act on. |
| "+ Novo" button and its 4-item menu | Removed | Each page's own main button covers this (Učitaj dokument, Novi klijent, Novo pitanje). |
| Client switcher "Klijent: Svi klijenti" | Removed from the menu (decision 2, §9) | A hidden global filter that changes every page is confusing. Opening the client in **Klijenti** shows everything for that client. |
| Collapse button [◧] | Removed (the `[` shortcut keeps working) | A short menu doesn't need collapsing. |
| Provjera ugovora | Becomes the **Rizici** tab inside a contract (decision 1, §9) | Today it repeats the document list. You review a contract from the contract itself. |
| Asistenti | A picker inside **Pitanja**. Managing assistants moves to **Postavke**. | Assistants are used while asking, so they belong where you ask. |
| Izvori prava | Moves to **Postavke**, plus one small control inside Pitanja | It is set once and rarely changed. |
| Zapisnik aktivnosti | Moves to **Postavke** (admins only) | It is an office record, not daily work. |
| Moj račun, Prečaci, Odjava | Stay in the profile menu | — |

### Top bar on every page

| Today | After |
| --- | --- |
| Title + subtitle sentence | Title only |
| "Pretraži ili skoči… ⌘K" | A quiet "🔍 Pretraži" button with no ⌘K badge (⌘K still works) |
| Bell | Stays |
| "Izvori prava 7 ▾" (Dokumenti, Pitanja, Provjera) | Removed |
| "Predlošci" (Provjera) | Moved to Postavke |
| Page buttons (Učitaj dokument, Novi ugovor, Novi klijent) | The page's **one** main button |

### Phone tab bar

Pregled, Dokumenti, Pitanja, Propisi, and Više stay, with **Pregled** renamed to **Početna**. *Više* opens the same short list as the desktop menu.

### Old links keep working

`/provjera`, `/izvori`, `/asistenti`, and `/zapisnik` redirect to their new homes, so bookmarks and links in notifications don't break.

---

## 5. Screen by screen

### 5.1 Početna (`/`)

**Today:** "Pregled ureda" with the date, an upload button, the greeting "Dobro jutro, Ana." with a demo line, the question box with a hint line, 4 number tiles, "Za vas danas" (up to 7 rows), "Nastavite" (a table), and "Datumi i rokovi" (two tabs plus a timezone label).

**After:**

```
Dobro jutro, Ana.                                   [ Učitaj dokument ]

┌──────────────────────────────────────────────────────────┐
│ 🔍  Što želite pitati?                          [ Pitaj ]│
└──────────────────────────────────────────────────────────┘

Za vas danas
  ⚠  Obrada nije uspjela · Ugovor 7488952            Pokušaj ponovno
  📅 Rok za 2 dana · Ugovor o poslovnoj suradnji     Otvori

Nedavno
  Ugovor 7488952                                     prije 2 sata
  Ugovor o najmu test                                prije 11 sati
  Ugovor o poslovnoj suradnji                        3. lis
                                                     Svi dokumenti →
```

- The greeting **is** the page title. The date line and "Pregled ureda" go. The demo line becomes a small "DEMO" tag that appears in demo mode only.
- The question box stays. The hint line under it goes.
- **The 4 number tiles go.** Their numbers already appear in the lists and the menu badge.
- **"Datumi i rokovi" merges into "Za vas danas"**: deadlines in the next 14 days appear there, and past dates live on the document. The Nadolazeći/Prošli tabs and "Europe/Zagreb" go.
- "Za vas danas" shows at most 5 rows, then "Prikaži sve (n)". A failed document gets **one** row, not one per analysis.
- "Nastavite" becomes "Nedavno": 5 plain rows with name and time, and no table header. A status appears only for *U obradi* or *Greška*.
- When nothing is waiting, it shows one line: "Sve je pregledano."

**Target:** fits on one 1440×900 screen without scrolling.

### 5.2 Dokumenti

- Remove the subtitle "3 dokumenata u radnom prostoru ureda" and the "Izvori prava" dropdown.
- One main button: **Učitaj dokument**.
- The filter row becomes a search box plus a single **Filtri** button. Client, status, type, and sort go inside it. The default sort stays "Najnovije prvo".
- Columns: **Dokument · Klijent · Status · Dodano**. Status becomes *one* badge, shown only for *U obradi* or *Greška*, where today each analysis type gets its own badge ("Sažetak · Greška", "Detaljna analiza · Greška").
- Remove the second line under each name (type · file name).

### 5.3 Document page (`/dokumenti/[id]`)

**Today:** a 3-level breadcrumb with the title repeated as a heading, a type badge, a date, and a file name; a "Provjeri rizike" button; 4 tabs with status badges; and a permanent "Izvori i dokazi" panel with explanation text, a search box, and the document text.

**After:**

```
← Dokumenti
Ugovor o poslovnoj suradnji
Studio Jadran · 3. lis 2026.

[ Razgovor ]  Sažetak   Rizici   Tekst
───────────────────────────────────────────────────────────
                       (conversation uses the full width)
```

- Show a back link instead of the breadcrumb, the title **once**, and one meta line (client · date).
- **Tabs:** Razgovor · Sažetak · **Rizici** (contracts only, replacing the "Provjeri rizike" button and the separate Provjera page) · Tekst.
  - *Sažetak* and *Detaljna analiza* merge into one tab, with a "Prikaži detaljno" switch inside.
  - Tabs carry no "Analizirano" badges. A small spinner shows while processing, and a red dot shows on error.
- **The "Izvori i dokazi" panel stays hidden until a citation is clicked**, then slides in. The conversation gains about a third of the screen width.
- **Answers:** the meta lines ("Pretraženo 7 izvora · 9 pronađenih odlomaka", "Citati provjereni · 9/9", the category counts "Propisi 3 · Sudska praksa 4 · EU 2") collapse into a single "9 izvora ▸" that expands.
- **Composer:** remove the "Opseg: …" line, the "Izvori · Vaši dokumenti" chip, and the keyboard hints. The two attach buttons (file and image) become **one** paperclip.

### 5.4 Contract review, now the **Rizici** tab

**Today, with one contract open:** 657 words, 71 clickable things, and 3 screens tall. It shows 6 template chips, 5 filter chips, a meta sentence, and 10 findings that are all fully expanded, each with 3 buttons.

**After:**

```
7 nedostaje · 3 djelomično         Predložak: Ugovor o pružanju usluga ▾   Preuzmi PDF

●  Ugovorne strane i osnovni podaci          Nedostaje     Visoka      ▸
●  Odgovornost i naknada štete               Nedostaje     Visoka      ▸
●  Predmet i opseg usluga                    Djelomično    Visoka      ▸
…
   3 teme su u redu ▸

AI prijedlog · provjerite prije primjene.
```

- **Each finding is one row** (status · title · importance), sorted with the most important and missing first. Clicking a row opens the question, what's missing, the recommendation, the legal basis, and the actions.
- **Actions inside an open finding:** *Prihvati* and *Odbaci*, plus a small "Komentar" link. That is 2 buttons instead of 3.
- **The 6 template chips become one dropdown**, with the recommended template preselected. The "ured" and "preporučeno" tags go.
- **The 5 filter chips go.** The sort order does that job, and "Obuhvaćeno" items fold into one line at the bottom.
- The meta sentence ("provjera prema kriterijima, bez AI obrade · svaki nalaz zahtijeva stručnu provjeru") becomes one short line at the bottom.
- The contract list on the left goes, because you arrive here from the contract. Managing templates (*Predlošci*) moves to Postavke.

**Target:** all 10 findings visible on the first screen as rows.

### 5.5 Pitanja (`/pitanja`)

**Today:** 3 columns (history, conversation, evidence panel); 6 example questions under 3 category headings; an explanatory paragraph and a hint line; 3 composer chips (Asistent, Svi klijenti, Izvori 7/7); keyboard hints; a disclaimer; and the header "Izvori prava" dropdown.

**After:**

```
Pitanja                                             Povijest   [ Novo pitanje ]

                         Što želite pitati?
      ┌──────────────────────────────────────────────────────┐
      │                                                      │
      │                                                  (→) │
      └──────────────────────────────────────────────────────┘
        Asistent: Opći ▾     Izvori ▾

      Izvanredni otkaz — hodogram · Zastara u trgovačkim ugovorima ·
      Pravna osnova obrade (GDPR)

      AI može pogriješiti — provjerite izvore.
```

- **History becomes a "Povijest" button** that opens a side drawer, with search inside it. The conversation gets the full width.
- **The evidence panel appears only when a citation is clicked**, as on the document page.
- **Show 3 examples instead of 6**, without category headings. Remove the paragraph and the hint "Odabrani predložak upisuje se u polje…".
- **One small row under the box:** "Asistent ▾" and "Izvori ▾". The client choice moves inside "Izvori ▾", and the separate "Svi klijenti" chip goes.
- The keyboard hints and the header "Izvori prava" dropdown go.
- "+ Novo istraživanje" becomes the page's main button, **Novo pitanje**.
- **The disclaimer stays, shorter.** In legal work it has to be there.

### 5.6 Klijenti (`/klijenti`, `/klijenti/[id]`)

- Remove the subtitle. Main button: **Novi klijent**.
- Each card shows the name, the sector, and "n dokumenata". "n predmet" and "zadnji dokument …" go.
- **The client page becomes the "client view"** and replaces the old global client switcher. It shows that client's documents, open regulation changes, and an "Učitaj dokument" button that is pre-filled for the client.

### 5.7 Propisi (`/propisi`)

- Remove the subtitle. "Vanjski regulatorni izvori još nisu povezani" appears only in the empty state, if at all.
- Tabs: **Novo (n)** · **Pregledano**. The "Sve" tab goes.
- Search stays. The severity and client filters move into **Filtri**.
- Each change shows its title, the affected clients, and **Označi pregledanim**.
- Fix the bug where "Ručno učitani dokument" appears twice in the client filter.

### 5.8 Postavke (new)

A plain list in which each item opens a simple page:

- **Moj račun**
- **Izvori prava**
- **Asistenti**
- **Predlošci provjere**
- **Zapisnik aktivnosti** (admins only)
- **Prečaci tipkovnice**

**Izvori prava**
- Show a simple on/off list: name plus one line of description.
- Statute and CELEX codes, article counts, and "ažurirano prije 3 sata" go behind **Detalji** on each source.
- Hide the 6 "Nije povezano" sources (decision 3, §9).
- Remove the "7 / 13 aktivnih izvora" block and its paragraph.

**Asistenti**
- Each card shows the name, one line of description, and **Koristi**. The AI instructions, about 40 words, move behind **Uredi**.
- The intro paragraph, the code tags (ZOR, ZOO…), and "LTB Law · 2 predložaka pitanja" go.

**Zapisnik aktivnosti** stays as it is and only moves.

### 5.9 Phone

- Top bar: logo, search, and bell. The upload icon goes; upload is the page's main button.
- The page header shows the title only, with no date or subtitle.
- **Target:** at most 140 px of fixed bars, down from 258 px.

---

## 6. What we are *not* removing

Your words were "the user doesn't need to have absolutely every feature … **on the page that is opened**". So features move out of sight; they don't leave the product. All of these still work after the change:

- uploading (including drag-and-drop anywhere), summaries, detailed analysis, document chat, and citations
- contract review, templates, comments, and the PDF report
- legal research, assistants, source selection, and history
- regulatory tracking, the activity log, and account settings
- ⌘K search and every keyboard shortcut

The only control removed outright is the **global client switcher** in the menu. The client page does its job (decision 2, §9).

---

## 7. Targets: how we'll know it worked

| Measure | Today | Target |
| --- | --- | --- |
| Menu items (controls / words) | 14 / 47 | 7 / ~10 |
| Početna: words / clickable things | 201 / 34 | ≤ 90 / ≤ 18, no scrolling at 1440×900 |
| Pitanja (empty): words / clickable things | 265 / 39 | ≤ 70 / ≤ 20 |
| Contract review: words / clickable things / height | 657 / 71 / 2628 px | ≤ 200 / ≤ 25 / first screen shows every finding |
| Izvori prava: words | 336 | ≤ 120 |
| Asistenti: words | 340 | ≤ 100 |
| Blue buttons per screen | up to 2–3 | 1 |
| Upload buttons visible at once | 2–3 | 1 |
| Phone: fixed bars | 258 px (32 %) | ≤ 140 px |
| Smallest common text size | 12 px | 13 px (body 15 px) |

**The granny test:** give 3 people who have never seen LTB Law these 4 tasks, with no help:

1. Upload a contract and see what's wrong with it.
2. Ask a legal question and open one of its sources.
3. Find all documents for one client.
4. Mark a regulation change as reviewed.

Pass means all 4 tasks are done with no "where do I click?" moment.

---

## 8. Order of work

Each step ships separately and is checked in the browser at desktop and phone width before the next one starts.

| Step | What | Main files |
| --- | --- | --- |
| 1 | **Menu and top bar** (biggest relief, touches every page): the new 5-item menu, an empty Postavke page, removing subtitles, the "Izvori prava" header dropdown and the visible keyboard hints, the larger text sizes, and redirects for moved pages | `shell/nav.ts`, `Sidebar.tsx`, `shell/WorkspaceShell.tsx`, `ui.tsx` (`PageHeader`), `shell/SearchTrigger.tsx`, `globals.css` |
| 2 | **Početna** | `(workspace)/page.tsx`, `AskBar.tsx`, `DashboardDates.tsx` |
| 3 | **Document page**, with contract review as the **Rizici** tab | `dokumenti/[id]/page.tsx`, `DocumentWorkbench.tsx`, `ModeTabs.tsx`, `DocumentChat.tsx`, `EvidenceWorkspace.tsx`, `review/TemplateReview.tsx`, `provjera/page.tsx` |
| 4 | **Pitanja** | `research/ResearchWorkspace.tsx`, `research/Answer.tsx`, `Composer.tsx`, `SourceChips.tsx`, `SourcesDropdown.tsx` |
| 5 | **Lists:** Dokumenti, Klijenti, Propisi (and the duplicate-client bug) | `dokumenti/page.tsx`, `klijenti/*`, `propisi/page.tsx`, `AutoFilter.tsx` |
| 6 | **Postavke pages:** Izvori, Asistenti, Predlošci, Zapisnik | `izvori/page.tsx`, `asistenti/page.tsx`, `research/PlaybookManager.tsx`, `provjera/predlosci/*`, `zapisnik/page.tsx` |
| 7 | **Phone pass, then the granny test** | `globals.css`, `shell/WorkspaceShell.tsx` |

The existing test suites (`npm test`, `npm run test:integration`, `npm run test:workspace`) must stay green after each step. Some HTTP checks may need updating where URLs move.

---

## 9. Three decisions for you

1. **Contract review moves inside the contract** as the *Rizici* tab, and its menu item goes. *Recommended.* The alternative is to keep "Provjera" in the menu as a 6th item.
2. **The global client switcher leaves the menu**, and the client's own page becomes the client view. *Recommended.* The alternative is to keep it, but as a filter on the Dokumenti page only.
3. **Sources that aren't connected are hidden** rather than listed as "Nije povezano". *Recommended.* The alternative is a single line: "Uskoro: HANFA, HAKOM, AZTN, DKOM…".

---

## 10. Progress

### Step 1: menu and top bar (done, 15 October 2026)

**What changed**
- The menu is now Početna, Dokumenti, Klijenti, Pitanja, Propisi, then Postavke and the profile.
- These are gone from the menu: the group labels, the firm card, the client switcher, "+ Novo", and "Pristup po odobrenju". The firm name moved into the profile menu.
- A new **Postavke** page lists Moj račun, Izvori prava, Asistenti, Predlošci provjere, Zapisnik aktivnosti, and Prečaci tipkovnice.
- Page subtitles are removed everywhere. Breadcrumbs became one "← Back" link.
- The "Izvori prava" dropdown and "Predlošci" are gone from the page headers.
- Search is now a quiet "Pretraži" button. The ⌘K badge, the composer hints ("↵ pošalji · ⇧↵ novi red"), and the search dialog's key legend are removed.
- Text is 1 px larger across the board: body 15 px, smallest 13 px. Everyday buttons are 40 px tall and menu items 42 px.
- On the phone, the upload icon is gone from the top bar, and "Pregled" is now "Početna".

**Measured at 1440×900 (before → after)**

| Screen | Words | Clickable things |
| --- | --- | --- |
| Menu | 47 → 13 | 14 → 8 |
| Početna | 201 → 159 | 34 → 28 |
| Pitanja (empty) | 265 → 173 | 39 → 32 |
| Contract review | 657 → 597 | 71 → 63 |
| Izvori prava | 336 → 289 | 30 → 25 |
| Asistenti | 340 → 296 | 25 → 20 |

**Where step 1 differs from the plan**
- **No redirects yet.** No page has changed its address so far. Redirects come with steps 3 and 6, when pages actually move.
- **The collapse button** shows only while the menu is collapsed, so the way back out is always visible. Collapsing is done with `[` or through search.
- **Zapisnik aktivnosti is not limited to admins.** Doing that would change who can see the log, so it stays as it was: visible to anyone whose firm has the module. This is still open.
- **The client switcher's plumbing stays for now.** Anyone who already has a client filter active still sees "Prikaži sve klijente" and can clear it. The code is removed in step 5, when the client page takes over.
- **Two explanation lines on the empty Pitanja screen were removed early.** The larger text pushed the example questions under the composer.

**Checks:** typecheck clean; 57 platform checks, 11 workspace checks, and 100 HTTP checks pass (3 new ones cover Postavke); browser checked at 1440, 768, and 375 px, with no sideways scrolling.
