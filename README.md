# LTB Law — privatni radni prostor

Jedna aplikacija za više odvjetničkih ureda, s odvojenim pristupom, korisnicima, podacima i konfiguracijom funkcija. Nema javne registracije, kupnje ni automatske aktivacije.

## Trenutačno stanje

Prva funkcionalna faza redizajna uključuje suvremeno sučelje na hrvatskom, prijavu, privatnu LTB administraciju, izradu ureda, pozivnice, korisničke uloge, odabir funkcija i personalizaciju naziva, boje i pozdrava ureda. Postojeći dokumentni i pravni tokovi premješteni su iza provjere pristupa.

Ova faza koristi **SQLite na trajnom disku jednog poslužitelja**. Identiteti, sesije, pozivnice, uredi i poslovi obrade imaju zasebne tablice; sadržaj svakog ureda privremeno se sprema u zaseban JSON zapis s provjerom verzije. To nije dovršena produkcijska migracija na Supabase/PostgreSQL. Vercel/Lambda namjerno su onemogućeni za ovaj način pohrane.

Potpun plan i preostali koraci: [REDESIGN_PLAN.md](REDESIGN_PLAN.md).

## Lokalno pokretanje

Potreban je Node.js 22.13+ iz grane 22 ili Node.js 24+ s podrškom za `node:sqlite`.

Za brzi pregled bez postavljanja pokrenite demo (`npm run dev`, vidi „Lokalna demonstracija”). Stvarna platforma:

```sh
npm install
npm run setup:admin
npm run dev:platform
```

`setup:admin` interaktivno traži ime, e-adresu i lozinku prvog LTB administratora. Lozinka se ne prikazuje, ne prosljeđuje argumentima naredbe i ne sprema kao običan tekst. Nema zadanih računa ili lozinki. Postojeći administrator ne prepisuje se ovom naredbom.

Otvorite `http://localhost:3000/prijava`. Nakon prijave LTB administrator ulazi u `/admin`, a član ureda u `/`.

Bez početnog administratora prijava prikazuje stanje pripreme. Nijedan stvarni ured, korisnik ili demo-sadržaj ne izrađuje se automatski.

## Dodavanje ureda i korisnika

1. U **Administracija → Uredi → Dodaj ured** unesite naziv, identitet i dostupne funkcije. Novi ured ostaje u pripremi.
2. Na stranici ureda dodajte korisnika i dodijelite ulogu člana ili administratora ureda.
3. Kopirajte pojedinačnu pozivnicu i dostavite je dogovorenim privatnim kanalom. Aplikacija u ovoj fazi **ne šalje e-poštu**.
4. Korisnik otvara pozivnicu i postavlja osobnu lozinku. Pozivnica vrijedi 48 sati i može se iskoristiti jednom.
5. Nakon provjere konfiguracije i komercijalnog dogovora aktivirajte ured.

Ponovno izdavanje pozivnice opoziva prethodnu i može se koristiti za obnovu lozinke. Deaktivacija korisnika ili suspenzija ureda poništava pristup. Promjena funkcija vrijedi već pri sljedećem zahtjevu. Isključivanje funkcije ne briše njezine podatke.

LTB administrator upravlja konfiguracijom i korisnicima, ali ne dobiva automatski pristup dokumentima ureda. Administrator ureda može mijenjati dostupne postavke izvora; samo LTB upravlja korisnicima i funkcijama u ovoj fazi.

## Konfiguracija

Postavite varijable u lokalni `.env.local` ili u okruženje poslužitelja. Ne spremajte tajne u repozitorij.

| Varijabla | Namjena |
| --- | --- |
| `LTB_DATABASE_PATH` | Put do trajne SQLite baze; zadano `data/platform.sqlite`. Istu putanju moraju koristiti postavljanje administratora i aplikacija. |
| `LTB_APP_URL` | Pouzdano ishodište aplikacije za provjeru zahtjeva i izradu pozivnica, npr. `http://localhost:3000`. Postavite eksplicitno iza proxyja. |
| `APP_BASE_URL` | Pouzdani URL za n8n povratne pozive; obavezan u produkcijskom načinu. |
| `ANTHROPIC_API_KEY`, `LTBLAW_MODEL` | Postojeća konfiguracija AI odgovora. Model mora biti dostupan na vašem računu. |
| `N8N_WEBHOOK_SAZETAK`, `N8N_WEBHOOK_DETALJNA` | Webhookovi za sažetak i detaljnu obradu. |
| `N8N_DOC_WEBHOOK_URL` | Postojeći zajednički zamjenski webhook. |
| `N8N_SHARED_SECRET` | Obavezna tajna za prihvat povratnog poziva; prazan ključ više ne dopušta pozive. |

Početno postavljanje iz naredbenog retka ne učitava Next.js `.env` datoteke; ako koristite prilagođenu putanju baze, izvezite `LTB_DATABASE_PATH` prije `npm run setup:admin`.

Sesije traju osam sati. Kolačić je HttpOnly/SameSite i Secure u produkcijskom načinu; produkcija zahtijeva HTTPS. Sigurnosne kopije SQLite baze trebaju uključivati konzistentan SQLite backup, a ne samo kopiranje glavne datoteke dok postoje WAL zapisi. Postupak oporavka još nije provjeren za produkciju.

## Dokumenti i obrada

- PDF, DOCX, TXT i Markdown; do 10 datoteka, 10 MB po datoteci i 25 MB po zahtjevu.
- Registar dokumenata, pretraga i filtri, klijenti, razgovor, slikovni prilozi, sažetak, detaljna obrada i provjera ugovora.
- Poslovi obrade i vlasništvo povratnog poziva spremaju se zajedno. Povratni poziv mora navesti odgovarajući posao i dokument te imati valjanu tajnu; ponovljeni rezultati ne prepisuju završenu obradu.
- Ako AI nije konfiguriran, pretraga može vratiti jasno označeni izdvojeni tekst iz dokumenata. Pogreška aktivnog AI servisa ne zamjenjuje se tihim demo-odgovorom.
- Učitani dokumenti trenutno se čuvaju kao izdvojeni tekst. **Trajno spremanje izvornih binarnih datoteka ostaje za sljedeću fazu.**
- Povezani izvori: dokumenti ureda te zajednička pravna baza (`data/legal.sqlite`) s propisima RH, sudskom praksom, EU propisima, presudama Suda EU-a, ESLJP-om i AZOP-om. Izvori koji nisu u bazi (HANFA, HAKOM, AZTN, DKOM, web) prikazuju se kao “Nije povezano”.

Stare datoteke `data/db.json` i postojeći Redis sadržaj nisu obrisani niti automatski dodijeljeni novim uredima. Uvoz zahtijeva provjeru pripadnosti sadržaja i zaseban migracijski korak.

## Pravni izvori i istraživanje

Pravna baza gradi se iz službenih izvora i ne sadrži podatke ureda:

```sh
npm run ingest:legal            # sve izvore (oko 6 minuta)
node scripts/ingest-legal.mjs --only=statutes         # samo propisi (s pročišćavanjem)
node scripts/ingest-legal.mjs --only=cases --cases-per-topic=10
node scripts/ingest-legal.mjs --only=cjeu,echr,azop
```

- **Narodne novine** — ZOR, ZOO, ZTD, ZPP, Zakon o provedbi Opće uredbe o zaštiti podataka, ZZP, ZZKPP; raščlanjeno po člancima s naslovima i odjeljcima. **Pročišćeni tekst gradi se automatski** (`scripts/lib/consolidate.mjs`): zakoni o izmjenama primjenjuju se kronološki (zamjena i brisanje članaka, stavaka i točaka, novi članci „12.a”, izmjene riječi i naslova). Upute koje se ne mogu pouzdano primijeniti ne pogađaju se — bilježe se uz članak, a korisnik vidi upozorenje i popis neugrađenih uputa. Izvorni tekst ostaje dostupan („Izvorni tekst (prije izmjena)”). Odluke Ustavnog suda nisu ugrađene. Trenutačno je primijenjeno oko 850 izmjena članaka, a ~155 uputa čeka ručnu provjeru (ispis na kraju ingest-a).
- **Ured za publikacije EU (Cellar)** — GDPR, Direktiva 93/13, Direktiva 2011/7, Rim I, Bruxelles I.a, Direktiva 2011/83 (hrvatska verzija, po člancima).
- **odluke.sudovi.hr** — odabrane odluke po temama iz `src/lib/legal/catalog.mjs`, s punim tekstom, ECLI, sudom, datumom, vrstom i stvarnim kazalom.
- **Sud Europske unije (Cellar)** — odabrane presude na hrvatskom jeziku (zaštita podataka, radno vrijeme, nepoštene odredbe i krediti u CHF, hrvatski predmeti), s predmetom, datumom i ključnim pojmovima.
- **ESLJP (HUDOC)** — presude protiv Hrvatske: naziv, broj zahtjeva, datum, članci Konvencije i ishod. Hrvatske prijevode Ureda zastupnika dopušteno je objavljivati samo u HUDOC-u, pa se **puni tekst ne pohranjuje** — otvara se na HUDOC-u.
- **AZOP (azop.hr)** — objavljena (anonimizirana) rješenja Agencije za zaštitu osobnih podataka.
- Pretraga: FTS5/bm25 s težinama polja, hrvatsko skraćivanje riječi, pravni sinonimi, IDF-ponderirana pokrivenost upita, izravne reference („ZOR 116”, „čl. 17.a ZOR-a”) i proširenje upita povratnom vezom (RM3): kad doslovni upit nađe premalo, dodaju se pojmovi koji se ponavljaju u najboljim pogocima, a korak pretrage pokazuje kojima. Semantička (vektorska) pretraga još nije uključena — zahtijeva indeks ugrađivanja i ostaje sljedeći korak.
- Katalog (zakoni, izmjene, CELEX brojevi, teme sudske prakse) uređuje se u `src/lib/legal/catalog.mjs`; ponovno pokretanje zamjenjuje zapise na mjestu. Zahtjevi su razmaknuti kako bi se poštovali javni poslužitelji.

Istraživanje (`/pitanja`) i razgovor o dokumentu odgovaraju kroz tok događaja (`POST /api/research/stream`, `POST /api/documents/:id/chat/stream`): vidljivi koraci pretrage, numerirani izvori pohranjeni uz odgovor (radi revizijskog traga), programski izračun rokova (ZPP čl. 112., hrvatski blagdani) i provjera citata nakon odgovora. Bez `ANTHROPIC_API_KEY` odgovor se sastavlja iz izdvojenih odlomaka i jasno je označen. Povijest istraživanja privatna je za svakog korisnika. Administrator ureda može dodati asistente ureda (`/api/playbooks`).

Provjera ugovora koristi predloške (usluge, zakup, NDA, ugovor o radu) s temama, pitanjima i kriterijima; svaki kriterij navodi odlomak ugovora. Administrator ureda uređuje vlastite predloške (`/provjera/predlosci`) uz pregled uživo na odabranom dokumentu; kriteriji se zadaju ključnim riječima (bez korisničkih regularnih izraza). Odluke odvjetnika (prihvaćeno/odbačeno, komentar) spremaju se uz dokument. Pravila ureda ostaju dostupna kao zaseban predložak.

## Provjera

```sh
npm test
npm run test:workspace
npm run test:legal        # zahtijeva npm run ingest:legal
npm run build
npm run test:integration
npm run typecheck
```

Testovi identiteta koriste privremenu bazu. Integracijski test pokreće vlastiti lokalni poslužitelj, privremene korisnike/urede i lažni lokalni n8n servis. Ne koristi stvarne ključeve ni podatke; nakon završetka uklanja svoju privremenu bazu. Integracijski test zahtijeva prethodno dovršenu produkcijsku izgradnju i pravo otvaranja lokalnog porta.

## Prije stvarne produkcije

Dovršiti normalizirani PostgreSQL/Supabase model i politike pristupa, privatnu pohranu originalnih datoteka, MFA za LTB administratore, provjerenu dostavu pozivnica ako se želi e-pošta, migraciju, sigurnosne kopije/oporavak, nadzor poslova te neovisnu provjeru pristupa i dostupnosti. Ne pokretati ovu fazu na privremenom ili višeposlužiteljskom datotečnom sustavu.

## Lokalna demonstracija

```sh
npm run dev              # demo na http://localhost:3000
npm run ingest:legal     # jednom: propisi, EU pravo i sudska praksa (oko 4 minute)
```

`npm run dev` pri prvom pokretanju sam priprema zasebnu demonstracijsku bazu (`data/demo.sqlite`) s izmišljenim uredima, klijentima i dokumentom te uključuje **demo prijavu**: na `/prijava` umjesto obrasca stoje dva gumba — „Uđi kao ured” i „Uđi kao administrator”. Druga vrata: `node scripts/start-demo.mjs --port 3010`.

Demo prijava radi samo uz `LTB_DEMO_MODE=1` (postavlja je skripta) i nikada u produkcijskoj izgradnji; stvarna instalacija i dalje koristi pozivnice i lozinke (`npm run dev:platform` pokreće platformu bez demo načina). AI i n8n veze u demonstraciji su isključene; za stvarne AI odgovore pokrenite `LTB_DEMO_AI=1 ANTHROPIC_API_KEY=… npm run dev`. Glavna baza ostaje odvojena.

## Radni prostor s izvorima

Dokument zadržava razgovor, nacrt pitanja i priloge pri prelasku na sažetak ili detaljnu analizu. Izvori se otvaraju uz rezultat na velikom zaslonu, odnosno u dijalogu na manjim zaslonima. Novi citati razgovora nose identifikatore dokumenta i odlomka. Stariji nepovezani navodi prikazuju upozorenje za ručnu provjeru; tekst navoda sam po sebi nije dokaz točnog povezivanja.

Pitanje uneseno na početnoj stranici prenosi se u istraživanje samo u memoriji otvorene aplikacije. Nacrti se ne pohranjuju u URL ni u lokalnu pohranu preglednika. Osvježavanje ili zatvaranje stranice može ih izgubiti; upozorenja preglednika nisu zajamčena u svim mobilnim okolnostima. Izvorne binarne datoteke još se ne prikazuju.
