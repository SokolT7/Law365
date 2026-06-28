import { randomUUID } from "crypto";
import { SEED_CONTRACTS } from "@/lib/seed/contracts";
import { chunkContract } from "@/lib/ingest/chunk";
import type { Chunk, DB, ExtractionResult } from "@/lib/types";

/** Iscrpna ekstrakcija za primjer (IT okvirni ugovor) — pripremljena unaprijed,
 *  da nadzorna ploča nije prazna i da prikazuje format rezultata bez poziva n8n-a. */
function exampleResult(): ExtractionResult {
  return {
    vrsta: "Okvirni ugovor o pružanju IT usluga",
    sazetak:
      "Okvirni ugovor između društava TechNova d.o.o. (Izvršitelj) i Jadran Logistika d.o.o. (Naručitelj) o razvoju i održavanju informacijskih sustava prema pojedinačnim narudžbenicama. Procijenjena godišnja vrijednost iznosi 120.000,00 EUR uz rok plaćanja od 90 dana. Ugovor je sklopljen na godinu dana s automatskim produljenjem, predviđa razinu usluge (dostupnost 99%, otklon kritičnih smetnji u 8 sati), prijenos vlasništva nad kodom na Naručitelja po uplati te primjenu prava Republike Hrvatske uz nadležnost Trgovačkog suda u Zagrebu.",
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

export function buildSeedDB(): DB {
  const firm = {
    id: "firm",
    name: process.env.LTBLAW_FIRM || "Odvjetničko društvo Marić & Jurić",
  };
  const user = { id: "user", name: "Ana Marić", role: "Odvjetnica · partnerica" };

  const sc = SEED_CONTRACTS[0];
  const clientId = randomUUID();
  const matterId = randomUUID();
  const docId = randomUUID();
  const createdAt = new Date(Date.now() - 36e5).toISOString();

  const chunks: Chunk[] = chunkContract(sc.text).map((c, i) => ({
    id: randomUUID(),
    documentId: docId,
    index: i,
    heading: c.heading,
    text: c.text,
  }));

  const result = exampleResult();

  return {
    firm,
    user,
    clients: [{ id: clientId, name: sc.clientName, sector: sc.sector }],
    matters: [{ id: matterId, clientId, title: sc.matterTitle, type: result.vrsta }],
    documents: [
      {
        id: docId,
        jobId: randomUUID(),
        title: sc.title,
        filename: sc.filename,
        type: result.vrsta,
        clientId,
        matterId,
        status: "analizirano",
        createdAt,
        mode: "demo",
        result,
      },
    ],
    chunks,
    audit: [
      {
        id: randomUUID(),
        ts: createdAt,
        actor: user.name,
        action: "Učitao i analizirao dokument",
        target: sc.title,
      },
    ],
  };
}
