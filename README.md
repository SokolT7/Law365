# LTB Law — privatni radni prostor

Jedna aplikacija za više odvjetničkih ureda, s odvojenim pristupom, korisnicima, podacima i konfiguracijom funkcija. Nema javne registracije, kupnje ni automatske aktivacije.

## Trenutačno stanje

Prva funkcionalna faza redizajna uključuje suvremeno sučelje na hrvatskom, prijavu, privatnu LTB administraciju, izradu ureda, pozivnice, korisničke uloge, odabir funkcija i personalizaciju naziva, boje i pozdrava ureda. Postojeći dokumentni i pravni tokovi premješteni su iza provjere pristupa.

Ova faza koristi **SQLite na trajnom disku jednog poslužitelja**. Identiteti, sesije, pozivnice, uredi i poslovi obrade imaju zasebne tablice; sadržaj svakog ureda privremeno se sprema u zaseban JSON zapis s provjerom verzije. To nije dovršena produkcijska migracija na Supabase/PostgreSQL. Vercel/Lambda namjerno su onemogućeni za ovaj način pohrane.

Potpun plan i preostali koraci: [REDESIGN_PLAN.md](REDESIGN_PLAN.md).

## Lokalno pokretanje

Potreban je Node.js 22.13+ iz grane 22 ili Node.js 24+ s podrškom za `node:sqlite`.

```sh
npm install
npm run setup:admin
npm run dev
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
- Aktivna je veza s dokumentima ureda. Katalog ostalih izvora prikazuje “Nije povezano”; nema tvrdnje da su vanjski izvori ili regulatorni feedovi aktivni. Stari demonstracijski korpus nije uključen u normalni rad.

Stare datoteke `data/db.json` i postojeći Redis sadržaj nisu obrisani niti automatski dodijeljeni novim uredima. Uvoz zahtijeva provjeru pripadnosti sadržaja i zaseban migracijski korak.

## Provjera

```sh
npm test
npm run test:workspace
npm run build
npm run test:integration
npm run typecheck
```

Testovi identiteta koriste privremenu bazu. Integracijski test pokreće vlastiti lokalni poslužitelj, privremene korisnike/urede i lažni lokalni n8n servis. Ne koristi stvarne ključeve ni podatke; nakon završetka uklanja svoju privremenu bazu. Integracijski test zahtijeva prethodno dovršenu produkcijsku izgradnju i pravo otvaranja lokalnog porta.

## Prije stvarne produkcije

Dovršiti normalizirani PostgreSQL/Supabase model i politike pristupa, privatnu pohranu originalnih datoteka, MFA za LTB administratore, provjerenu dostavu pozivnica ako se želi e-pošta, migraciju, sigurnosne kopije/oporavak, nadzor poslova te neovisnu provjeru pristupa i dostupnosti. Ne pokretati ovu fazu na privremenom ili višeposlužiteljskom datotečnom sustavu.

## Lokalna demonstracija

Za zasebnu demonstracijsku bazu s izmišljenim uredima, klijentima, dokumentom i unaprijed pripremljenim analizama:

```sh
node scripts/setup-demo.mjs
node scripts/start-demo.mjs
```

Otvorite `http://localhost:3010/prijava`. Prva naredba ispisuje nasumičnu demo lozinku i sprema pristupne podatke u zanemarenu lokalnu datoteku `data/demo-credentials.json`. Računi: `admin@ltb.demo` (LTB administracija), `ured@ltb.demo` (sve funkcije), `osnovni@ltb.demo` (osnovne funkcije). Ponovno postavljanje odbija prepisati postojeću demo bazu. Za ponovno pokretanje dovoljan je `start-demo.mjs`.

Demonstracija koristi samo `data/demo.sqlite`, dostupna je lokalno, a AI i n8n veze isključene su kako pregled ne bi slao podatke vanjskim servisima. Pripremljene analize služe za pregled; nova AI obrada nije aktivna. Glavna baza ostaje odvojena.


## Radni prostor s izvorima

Dokument zadržava razgovor, nacrt pitanja i priloge pri prelasku na sažetak ili detaljnu analizu. Izvori se otvaraju uz rezultat na velikom zaslonu, odnosno u dijalogu na manjim zaslonima. Novi citati razgovora nose identifikatore dokumenta i odlomka. Stariji nepovezani navodi prikazuju upozorenje za ručnu provjeru; tekst navoda sam po sebi nije dokaz točnog povezivanja.

Pitanje uneseno na početnoj stranici prenosi se u istraživanje samo u memoriji otvorene aplikacije. Nacrti se ne pohranjuju u URL ni u lokalnu pohranu preglednika. Osvježavanje ili zatvaranje stranice može ih izgubiti; upozorenja preglednika nisu zajamčena u svim mobilnim okolnostima. Izvorne binarne datoteke još se ne prikazuju.
