/**
 * Sintetički (izmišljeni) ugovori na hrvatskom jeziku za demo.
 * Ne sadrže nikakve stvarne podatke klijenata. Namjerno su ugrađene
 * tipične rizične odredbe kako bi pregled pronašao smislene nalaze.
 */
export interface SeedContract {
  title: string;
  type: string;
  filename: string;
  clientName: string;
  sector: string;
  matterTitle: string;
  text: string;
}

export const SEED_CONTRACTS: SeedContract[] = [
  {
    title: "Okvirni ugovor o pružanju IT usluga",
    type: "Okvirni ugovor o uslugama",
    filename: "okvirni-ugovor-it-usluge.txt",
    clientName: "Jadran Logistika d.o.o.",
    sector: "Logistika",
    matterTitle: "Jadran Logistika — nabava IT usluga",
    text: `OKVIRNI UGOVOR O PRUŽANJU IT USLUGA

Sklopljen u Zagrebu dana 14. siječnja 2026. godine između:
TechNova d.o.o., Radnička cesta 80, Zagreb, OIB: 12345678901 (dalje: Izvršitelj)
i
Jadran Logistika d.o.o., Slavonska avenija 11, Zagreb, OIB: 98765432109 (dalje: Naručitelj).

Članak 1. — Predmet ugovora
Izvršitelj se obvezuje Naručitelju pružati usluge razvoja i održavanja informacijskih sustava prema pojedinačnim narudžbenicama koje čine sastavni dio ovog Ugovora.

Članak 2. — Cijena i rok plaćanja
Ukupna procijenjena vrijednost usluga iznosi 120.000,00 EUR godišnje. Naručitelj se obvezuje plaćati ispostavljene račune u roku od 90 dana od dana primitka računa. Na zakašnjela plaćanja obračunava se zakonska zatezna kamata.

Članak 3. — Trajanje i produljenje
Ugovor se sklapa na razdoblje od jedne (1) godine. Ako nijedna strana ne dostavi pisanu obavijest o otkazu najkasnije 30 dana prije isteka, Ugovor se automatski produljuje na novo razdoblje od godine dana.

Članak 4. — Razina usluge
Izvršitelj se obvezuje osigurati dostupnost sustava od 99% na mjesečnoj razini te otkloniti kritične smetnje u roku od 8 sati od prijave.

Članak 5. — Prava intelektualnog vlasništva
Sav kod izrađen po narudžbi prelazi u vlasništvo Naručitelja po izvršenoj uplati.

Članak 6. — Mjerodavno pravo i nadležnost
Na ovaj Ugovor primjenjuje se mjerodavno pravo Republike Hrvatske. Za sve sporove nadležan je Trgovački sud u Zagrebu.

Članak 7. — Završne odredbe
Izmjene i dopune ovog Ugovora valjane su samo u pisanom obliku. Ugovor je sastavljen u dva istovjetna primjerka, po jedan za svaku stranu.`,
  },
  {
    title: "Ugovor o povjerljivosti (NDA)",
    type: "Ugovor o povjerljivosti (NDA)",
    filename: "ugovor-o-povjerljivosti-nda.txt",
    clientName: "Bjelovar Pharma d.o.o.",
    sector: "Farmaceutika",
    matterTitle: "Bjelovar Pharma — pregovori o suradnji",
    text: `UGOVOR O POVJERLJIVOSTI (NDA)

Sklopljen dana 3. veljače 2026. godine između:
Bjelovar Pharma d.o.o., Ulica kralja Tomislava 2, Bjelovar, OIB: 11223344556 (dalje: Otkrivatelj)
i
NovaBnk savjetovanje d.o.o., Ilica 191, Zagreb, OIB: 66554433221 (dalje: Primatelj).

Članak 1. — Svrha
Strane namjeravaju razmotriti moguću poslovnu suradnju te će u tu svrhu razmjenjivati povjerljive informacije.

Članak 2. — Povjerljive informacije
Povjerljivim informacijama smatraju se svi poslovni, tehnički i financijski podaci označeni kao povjerljivi, uključujući osobne podatke koji se obrađuju u skladu s važećim propisima o zaštiti podataka.

Članak 3. — Obveze primatelja
Primatelj se obvezuje čuvati povjerljive informacije te ih neće otkriti trećim osobama bez prethodne pisane suglasnosti Otkrivatelja. Obveza povjerljivosti traje pet (5) godina od dana sklapanja.

Članak 4. — Ograničenje odgovornosti
Ukupna odgovornost svake strane po ovom Ugovoru ograničena je najviše do iznosa od 20.000,00 EUR.

Članak 5. — Trajanje
Ovaj Ugovor stupa na snagu danom potpisa i ostaje na snazi do okončanja pregovora.

Članak 6. — Završne odredbe
Sve izmjene moraju biti u pisanom obliku.`,
  },
  {
    title: "Ugovor o najmu poslovnog prostora",
    type: "Ugovor o najmu",
    filename: "ugovor-o-najmu-poslovnog-prostora.txt",
    clientName: "Zagreb Nekretnine d.o.o.",
    sector: "Nekretnine",
    matterTitle: "Zagreb Nekretnine — najam lokala",
    text: `UGOVOR O NAJMU POSLOVNOG PROSTORA

Sklopljen u Zagrebu dana 20. siječnja 2026. godine između:
Zagreb Nekretnine d.o.o., Vlaška 5, Zagreb, OIB: 22334455667 (dalje: Najmodavac)
i
Caffe Bar Adriatic, obrt, Tkalčićeva 12, Zagreb, OIB: 77889900112 (dalje: Najmoprimac).

Članak 1. — Predmet najma
Najmodavac daje u najam poslovni prostor površine 85 m² na adresi Tkalčićeva 12, Zagreb, radi obavljanja ugostiteljske djelatnosti.

Članak 2. — Najamnina
Mjesečna najamnina iznosi 1.500,00 EUR i dospijeva do petog (5.) dana u mjesecu za tekući mjesec.

Članak 3. — Trajanje i otkaz
Ugovor se sklapa na neodređeno vrijeme. Svaka strana može otkazati Ugovor pisanim putem s otkaznim rokom od 8 dana.

Članak 4. — Ugovorna kazna
U slučaju zakašnjenja s plaćanjem najamnine Najmoprimac plaća ugovornu kaznu u visini od 2% mjesečne najamnine za svaki dan zakašnjenja.

Članak 5. — Održavanje
Najmoprimac je dužan održavati prostor s pažnjom dobrog gospodarstvenika te snositi troškove tekućeg održavanja.

Članak 6. — Zaštita podataka
Kontakt podaci predstavnika stranaka obrađuju se isključivo radi izvršenja ovog Ugovora, u skladu s Uredbom (EU) 2016/679 (GDPR).

Članak 7. — Mjerodavno pravo i nadležnost
Na ovaj Ugovor primjenjuje se mjerodavno pravo Republike Hrvatske, a za sporove je nadležan stvarno nadležni sud u Zagrebu.`,
  },
  {
    title: "Ugovor o pretplati na softver (SaaS)",
    type: "Ugovor o pretplati (SaaS)",
    filename: "ugovor-o-pretplati-saas.txt",
    clientName: "Dalmacija Retail d.o.o.",
    sector: "Maloprodaja",
    matterTitle: "Dalmacija Retail — SaaS pretplata",
    text: `UGOVOR O PRETPLATI NA SOFTVER (SaaS)

Sklopljen dana 28. siječnja 2026. godine između:
CloudSoft Ireland Ltd, 1 Grand Canal Square, Dublin, Irska (dalje: Pružatelj)
i
Dalmacija Retail d.o.o., Poljička cesta 35, Split, OIB: 33445566778 (dalje: Korisnik).

Članak 1. — Predmet
Pružatelj Korisniku daje pravo korištenja softvera kao usluge (SaaS) putem oblaka, prema odabranom planu pretplate.

Članak 2. — Naknada i razdoblje
Godišnja pretplata iznosi 36.000,00 EUR i plaća se unaprijed. Pretplatno razdoblje traje 12 mjeseci te se automatski produljuje za daljnjih 12 mjeseci, osim ako Korisnik ne otkaže najkasnije 60 dana prije isteka.

Članak 3. — Zaštita podataka
Strane sklapaju Ugovor o obradi podataka (DPA) kojim se uređuje obrada osobnih podataka u skladu s Uredbom (EU) 2016/679 (GDPR). Pružatelj djeluje kao izvršitelj obrade.

Članak 4. — Ograničenje odgovornosti
Ukupna odgovornost Pružatelja ograničena je najviše do iznosa godišnje pretplate plaćene u 12 mjeseci koji prethode događaju štete.

Članak 5. — Viša sila
Nijedna strana ne odgovara za neispunjenje uzrokovano višom silom (vis maior).

Članak 6. — Mjerodavno pravo i rješavanje sporova
Na ovaj Ugovor primjenjuje se i kao mjerodavno pravo ugovara se pravo Irske. Svi sporovi rješavaju se arbitražom u Londonu.

Članak 7. — Završne odredbe
Ugovor čini cjelinu s pripadajućim planom pretplate i DPA-om.`,
  },
  {
    title: "Ugovor o kupoprodaji robe",
    type: "Ugovor o kupoprodaji",
    filename: "ugovor-o-kupoprodaji-robe.txt",
    clientName: "Slavonija Agro d.o.o.",
    sector: "Poljoprivreda",
    matterTitle: "Slavonija Agro — isporuka robe",
    text: `UGOVOR O KUPOPRODAJI ROBE

Sklopljen u Osijeku dana 5. veljače 2026. godine između:
Slavonija Agro d.o.o., Vukovarska 200, Osijek, OIB: 44556677889 (dalje: Prodavatelj)
i
EuroFood Distribucija d.o.o., Zagrebačka 7, Velika Gorica, OIB: 55667788990 (dalje: Kupac).

Članak 1. — Predmet
Prodavatelj prodaje, a Kupac kupuje 500 tona pšenice prve klase prema dogovorenoj specifikaciji kvalitete.

Članak 2. — Cijena i plaćanje
Ukupna cijena iznosi 110.000,00 EUR. Kupac se obvezuje platiti cijenu u roku od 90 dana od isporuke i primitka računa.

Članak 3. — Isporuka
Prodavatelj se obvezuje isporučiti robu najkasnije do 15. ožujka 2026. godine na skladište Kupca u Velikoj Gorici (paritet DAP).

Članak 4. — Ugovorna kazna
U slučaju zakašnjenja s isporukom Prodavatelj plaća ugovornu kaznu u visini 0,5% ukupne cijene za svaki dan zakašnjenja, a najviše 10% ukupne cijene.

Članak 5. — Pregled i reklamacije
Kupac je dužan pregledati robu pri preuzimanju te eventualne vidljive nedostatke prijaviti u roku od 8 dana.

Članak 6. — Zaštita podataka
Osobni podaci kontakt osoba obrađuju se u skladu s važećim propisima o zaštiti podataka.

Članak 7. — Mjerodavno pravo i nadležnost
Na ovaj Ugovor primjenjuje se mjerodavno pravo Republike Hrvatske. Za sporove je nadležan Trgovački sud u Osijeku.`,
  },
];
