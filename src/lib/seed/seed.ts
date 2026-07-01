import { randomUUID } from "crypto";
import { SEED_CONTRACTS } from "@/lib/seed/contracts";
import { chunkContract } from "@/lib/ingest/chunk";
import { defaultSources } from "@/lib/sources";
import type { Chunk, DB, ExtractionResult, RegUpdate } from "@/lib/types";

/** Iscrpna ekstrakcija za primjer (IT okvirni ugovor) — pripremljena unaprijed,
 *  da nadzorna ploča nije prazna i da prikazuje format rezultata bez poziva n8n-a. */
function exampleResult(): ExtractionResult {
  return {
    vrsta: "Okvirni ugovor o pružanju IT usluga",
    sazetak:
      "Okvirni ugovor o razvoju i održavanju IT sustava između TechNova d.o.o. (Izvršitelj) i Jadran Logistika d.o.o. (Naručitelj), procijenjene vrijednosti 120.000,00 EUR godišnje uz rok plaćanja od 90 dana. Sklopljen je na godinu dana s automatskim produljenjem. Primjenjuje se hrvatsko pravo, a za sporove je nadležan Trgovački sud u Zagrebu.",
    strane: [
      { naziv: "TechNova d.o.o.", uloga: "Izvršitelj", oib: "12345678901", adresa: "Radnička cesta 80, Zagreb", izvor: { clanak: "Uvodne odredbe", citat: "TechNova d.o.o., Radnička cesta 80, Zagreb, OIB: 12345678901 (dalje: Izvršitelj)" } },
      { naziv: "Jadran Logistika d.o.o.", uloga: "Naručitelj", oib: "98765432109", adresa: "Slavonska avenija 11, Zagreb", izvor: { clanak: "Uvodne odredbe", citat: "Jadran Logistika d.o.o., Slavonska avenija 11, Zagreb, OIB: 98765432109 (dalje: Naručitelj)" } },
    ],
    odredbePoClancima: [
      { naslov: "Članak 1. — Predmet ugovora", sazetak: "Izvršitelj pruža usluge razvoja i održavanja informacijskih sustava prema pojedinačnim narudžbenicama koje su sastavni dio ugovora.", izvor: { clanak: "Članak 1." } },
      { naslov: "Članak 2. — Cijena i rok plaćanja", sazetak: "Procijenjena vrijednost 120.000,00 EUR godišnje; računi se plaćaju u roku od 90 dana od primitka; na zakašnjenje se obračunava zakonska zatezna kamata.", izvor: { clanak: "Članak 2.", citat: "Naručitelj se obvezuje plaćati ispostavljene račune u roku od 90 dana od dana primitka računa." } },
      { naslov: "Članak 3. — Trajanje i produljenje", sazetak: "Sklopljen na godinu dana; automatski se produljuje za novo godišnje razdoblje ako otkaz nije dostavljen najkasnije 30 dana prije isteka.", izvor: { clanak: "Članak 3.", citat: "Ugovor se automatski produljuje na novo razdoblje od godine dana." } },
      { naslov: "Članak 4. — Razina usluge", sazetak: "Zajamčena dostupnost sustava 99% mjesečno; kritične smetnje otklanjaju se u roku od 8 sati od prijave.", izvor: { clanak: "Članak 4." } },
      { naslov: "Članak 5. — Prava intelektualnog vlasništva", sazetak: "Kod izrađen po narudžbi prelazi u vlasništvo Naručitelja nakon izvršene uplate.", izvor: { clanak: "Članak 5." } },
      { naslov: "Članak 6. — Mjerodavno pravo i nadležnost", sazetak: "Primjenjuje se pravo Republike Hrvatske; za sporove je nadležan Trgovački sud u Zagrebu.", izvor: { clanak: "Članak 6." } },
      { naslov: "Članak 7. — Završne odredbe", sazetak: "Izmjene i dopune valjane su samo u pisanom obliku; ugovor je sastavljen u dva istovjetna primjerka.", izvor: { clanak: "Članak 7." } },
    ],
    kljucniUvjeti: [
      { naziv: "Predmet", vrijednost: "Razvoj i održavanje informacijskih sustava", izvor: { clanak: "Članak 1." } },
      { naziv: "Trajanje", vrijednost: "1 godina, uz automatsko produljenje", izvor: { clanak: "Članak 3." } },
      { naziv: "Razina usluge (SLA)", vrijednost: "Dostupnost 99% mjesečno", izvor: { clanak: "Članak 4." } },
      { naziv: "Rok otklona smetnji", vrijednost: "8 sati od prijave", izvor: { clanak: "Članak 4." } },
      { naziv: "Intelektualno vlasništvo", vrijednost: "Prelazi na Naručitelja po uplati", izvor: { clanak: "Članak 5." } },
      { naziv: "Oblik izmjena", vrijednost: "Isključivo u pisanom obliku", izvor: { clanak: "Članak 7." } },
    ],
    iznosi: [
      { opis: "Procijenjena godišnja vrijednost usluga", iznos: "120.000,00", valuta: "EUR", izvor: { clanak: "Članak 2.", citat: "Ukupna procijenjena vrijednost usluga iznosi 120.000,00 EUR godišnje." } },
    ],
    datumiIRokovi: [
      { opis: "Datum sklapanja ugovora", datum: "2026-01-14", vrsta: "datum", izvor: { clanak: "Uvodne odredbe" } },
      { opis: "Istek prvog razdoblja (procijenjeno)", datum: "2027-01-14", vrsta: "datum", izvor: { clanak: "Članak 3." } },
      { opis: "Rok plaćanja računa", vrsta: "rok", izvor: { clanak: "Članak 2.", citat: "u roku od 90 dana od dana primitka računa" } },
      { opis: "Rok za otkaz radi sprječavanja produljenja", vrsta: "rok", izvor: { clanak: "Članak 3.", citat: "najkasnije 30 dana prije isteka" } },
      { opis: "Rok otklona kritičnih smetnji", vrsta: "rok", izvor: { clanak: "Članak 4.", citat: "u roku od 8 sati od prijave" } },
    ],
    obveze: [
      { strana: "Izvršitelj", opis: "Pružati usluge razvoja i održavanja prema narudžbenicama.", izvor: { clanak: "Članak 1." } },
      { strana: "Naručitelj", opis: "Plaćati ispostavljene račune.", rok: "90 dana od primitka računa", izvor: { clanak: "Članak 2." } },
      { strana: "Izvršitelj", opis: "Osigurati dostupnost 99% i otkloniti kritične smetnje.", rok: "8 sati od prijave", izvor: { clanak: "Članak 4." } },
    ],
    prava: [
      { strana: "Naručitelj", opis: "Stječe vlasništvo nad izrađenim kodom nakon uplate.", izvor: { clanak: "Članak 5." } },
    ],
    mjerodavnoPravo: { pravo: "Pravo Republike Hrvatske", izvor: { clanak: "Članak 6." } },
    nadleznost: { opis: "Trgovački sud u Zagrebu", izvor: { clanak: "Članak 6." } },
    prestanak: { opis: "Automatsko produljenje za godinu dana, osim ako se ne otkaže.", otkazniRok: "30 dana prije isteka", izvor: { clanak: "Članak 3." } },
    reference: [
      { propis: "Zakon o obveznim odnosima (zakonska zatezna kamata)", izvor: { clanak: "Članak 2." } },
    ],
    napomene: [
      { opis: "Rok plaćanja iznosi 90 dana.", izvor: { clanak: "Članak 2." } },
      { opis: "Ugovor ne sadrži izričitu odredbu o ograničenju odgovornosti." },
      { opis: "Ugovor ne sadrži odredbu o obradi osobnih podataka (GDPR)." },
    ],
  };
}

/** Sintetički OIB-ovi za demo klijente (nisu stvarni). */
const SEED_OIBS = ["98765432109", "45291038476", "70143829561", "23984710652", "58730291846"];
const SEED_CONTACTS = [
  "Ivana Kovačević, direktorica",
  "dr. sc. Marko Babić, uprava",
  "Petra Šimunić, voditeljica pravnih poslova",
  "Tomislav Grgić, član uprave",
  "Katarina Vuković, prokuristica",
];

export function buildSeedDB(): DB {
  const firm = {
    id: "firm",
    name: process.env.LTBLAW_FIRM || "Odvjetničko društvo Marić & Jurić",
  };
  const user = { id: "user", name: "Ana Marić", role: "Odvjetnica · partnerica" };

  const now = Date.now();
  const db: DB = {
    firm,
    user,
    clients: [],
    matters: [],
    documents: [],
    chunks: [],
    audit: [],
    settings: { sources: defaultSources() },
    regUpdates: [],
  };

  // Svih 5 sintetičkih klijenata s po jednim predmetom i dokumentom.
  const clientIds: string[] = [];
  SEED_CONTRACTS.forEach((sc, idx) => {
    const clientId = randomUUID();
    const matterId = randomUUID();
    const docId = randomUUID();
    clientIds.push(clientId);
    // razmaknuti datumi: najstariji dokument ~12 dana, najnoviji ~1 sat
    const createdAt = new Date(now - (idx === 0 ? 36e5 : (idx * 3 + 1) * 864e5)).toISOString();

    db.clients.push({
      id: clientId,
      name: sc.clientName,
      sector: sc.sector,
      oib: SEED_OIBS[idx],
      contact: SEED_CONTACTS[idx],
    });
    db.matters.push({ id: matterId, clientId, title: sc.matterTitle, type: sc.type });

    const chunks: Chunk[] = chunkContract(sc.text).map((c, i) => ({
      id: randomUUID(),
      documentId: docId,
      index: i,
      heading: c.heading,
      text: c.text,
    }));
    db.chunks.push(...chunks);

    const isPrimary = idx === 0;
    const result = isPrimary ? exampleResult() : undefined;
    const sazetakResult: ExtractionResult | undefined = result
      ? {
          ...result,
          odredbePoClancima: result.odredbePoClancima.slice(0, 3),
          napomene: result.napomene.slice(0, 2),
        }
      : undefined;

    db.documents.push({
      id: docId,
      title: sc.title,
      filename: sc.filename,
      files: [sc.filename],
      type: sc.type,
      clientId,
      matterId,
      createdAt,
      analyses:
        isPrimary && result && sazetakResult
          ? [
              { mode: "detaljna", status: "analizirano", jobId: randomUUID(), createdAt, result },
              { mode: "sazetak", status: "analizirano", jobId: randomUUID(), createdAt, result: sazetakResult },
            ]
          : [],
      conversation: [
        {
          id: randomUUID(),
          role: "assistant",
          text: `Učitan je dokument „${sc.title}”. Pitajte me bilo što o njemu, ili gore pokrenite Sažetak ili Detaljnu analizu.`,
          ts: createdAt,
        },
      ],
    });

    db.audit.push({
      id: randomUUID(),
      ts: createdAt,
      actor: user.name,
      action: isPrimary ? "Učitao i analizirao dokument" : "Učitao dokument u radni prostor",
      target: sc.title,
    });
  });

  db.regUpdates = seedRegUpdates(clientIds, now);
  return db;
}

/** Sintetički (demo) prikaz praćenja propisa — stavke su izmišljene radi demonstracije. */
function seedRegUpdates(clientIds: string[], now: number): RegUpdate[] {
  const [itClient, pharmaClient, realEstateClient, retailClient, agroClient] = clientIds;
  const d = (daysAgo: number) => new Date(now - daysAgo * 864e5).toISOString();
  return [
    {
      id: randomUUID(),
      date: d(2),
      source: "EUR-Lex — Prijedlog Uredbe o suzbijanju kašnjenja u plaćanju",
      sourceId: "eu-propisi",
      title: "EU predlaže obvezni rok plaćanja od najviše 30 dana u B2B odnosima",
      summary:
        "Prijedlog uredbe zamjenjuje Direktivu 2011/7/EU i uvodi strogi rok plaćanja od 30 dana bez mogućnosti ugovaranja duljeg roka. Ugovori s rokom plaćanja od 60+ dana morat će se uskladiti.",
      areas: ["Trgovačko pravo", "Ugovori o uslugama"],
      severity: "visoka",
      affectedClientIds: [itClient, agroClient],
      action: "Pregledati ugovore s rokom plaćanja duljim od 30 dana i pripremiti anekse.",
    },
    {
      id: randomUUID(),
      date: d(5),
      source: "Narodne novine — Zakon o izmjenama i dopunama Zakona o radu",
      sourceId: "rh-zakoni",
      title: "Izmjene Zakona o radu: nova pravila o radu na daljinu i dodatnom radu",
      summary:
        "Proširene obveze poslodavca kod ugovaranja rada na daljinu (troškovi, oprema, zaštita na radu) te izmijenjeni uvjeti dodatnog rada kod drugog poslodavca.",
      areas: ["Radno pravo"],
      severity: "srednja",
      affectedClientIds: [pharmaClient, retailClient],
      action: "Ažurirati predloške ugovora o radu i pravilnike o radu klijenata.",
    },
    {
      id: randomUUID(),
      date: d(8),
      source: "EUR-Lex — Uredba (EU) o umjetnoj inteligenciji (AI Act)",
      sourceId: "eu-propisi",
      title: "AI Act: nove obveze za korisnike visokorizičnih AI sustava stupaju na snagu",
      summary:
        "Poduzeća koja koriste AI sustave u zapošljavanju, kreditnom bodovanju i kritičnoj infrastrukturi moraju uspostaviti nadzor, dokumentaciju i procjene sukladnosti.",
      areas: ["IT pravo", "Zaštita podataka"],
      severity: "srednja",
      affectedClientIds: [itClient],
      action: "Utvrditi koristi li klijent visokorizične AI sustave i pripremiti procjenu sukladnosti.",
    },
    {
      id: randomUUID(),
      date: d(11),
      source: "AZOP — Smjernice o obradi osobnih podataka radnika",
      sourceId: "azop",
      title: "AZOP objavio nove smjernice o nadzoru radnika i obradi podataka zaposlenika",
      summary:
        "Preciziraju se uvjeti video nadzora radnih prostorija, praćenja službene e-pošte i obrade biometrijskih podataka. Potrebna revizija internih akata poslodavaca.",
      areas: ["Zaštita podataka (GDPR)", "Radno pravo"],
      severity: "srednja",
      affectedClientIds: [pharmaClient, itClient],
      action: "Revidirati pravilnike o zaštiti podataka i obavijesti radnicima.",
    },
    {
      id: randomUUID(),
      date: d(15),
      source: "Narodne novine — Zakon o izmjenama Zakona o zakupu i kupoprodaji poslovnoga prostora",
      sourceId: "rh-zakoni",
      title: "Izmjene pravila o zakupu poslovnog prostora: indeksacija i otkazni rokovi",
      summary:
        "Nova pravila o usklađivanju zakupnine s indeksom potrošačkih cijena i minimalnim otkaznim rokovima kod zakupa na neodređeno vrijeme.",
      areas: ["Nekretnine", "Zakup"],
      severity: "visoka",
      affectedClientIds: [realEstateClient, retailClient],
      action: "Provjeriti klauzule o indeksaciji u aktivnim ugovorima o zakupu.",
    },
    {
      id: randomUUID(),
      date: d(20),
      source: "Narodne novine — Pravilnik o fiskalizaciji u prometu gotovinom",
      sourceId: "rh-zakoni",
      title: "Tehničke izmjene pravilnika o fiskalizaciji",
      summary:
        "Ažurirani tehnički zahtjevi za fiskalne blagajne i rokovi prilagodbe za obveznike fiskalizacije.",
      areas: ["Porezno pravo", "Maloprodaja"],
      severity: "niska",
      affectedClientIds: [retailClient],
      reviewed: true,
    },
  ];
}
