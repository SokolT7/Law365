// What the ingestion job loads. Every entry resolves to an official publication:
// Narodne novine (narodne-novine.nn.hr), the EU Publications Office (Cellar) and odluke.sudovi.hr.
// `match` is a case-insensitive substring of the title as listed in that NN issue.
// `decision: true` marks a Constitutional Court decision: recorded, but not mapped onto articles.

export const STATUTES = [
  {
    id: "zor", short: "ZOR", title: "Zakon o radu",
    base: { year: 2014, issue: 93, match: "zakon o radu" },
    amendments: [
      { year: 2017, issue: 127, match: "zakona o radu" },
      { year: 2019, issue: 98, match: "zakona o radu" },
      { year: 2022, issue: 151, match: "zakona o radu" },
      { year: 2023, issue: 64, match: "u-i-242/2023", decision: true },
    ],
  },
  {
    id: "zoo", short: "ZOO", title: "Zakon o obveznim odnosima",
    base: { year: 2005, issue: 35, match: "zakon o obveznim odnosima" },
    amendments: [
      { year: 2008, issue: 41, match: "zakona o obveznim odnosima" },
      { year: 2015, issue: 78, match: "zakona o obveznim odnosima" },
      { year: 2018, issue: 29, match: "zakona o obveznim odnosima" },
      { year: 2021, issue: 126, match: "zakona o obveznim odnosima" },
      { year: 2022, issue: 114, match: "zakona o obveznim odnosima" },
      { year: 2022, issue: 156, match: "zakona o obveznim odnosima" },
      { year: 2023, issue: 155, match: "zakona o obveznim odnosima" },
    ],
  },
  {
    id: "ztd", short: "ZTD", title: "Zakon o trgovačkim društvima",
    base: { year: 2011, issue: 152, match: "zakon o trgovačkim društvima" },
    amendments: [
      { year: 2012, issue: 111, match: "zakona o trgovačkim društvima" },
      { year: 2013, issue: 68, match: "zakona o trgovačkim društvima" },
      { year: 2015, issue: 110, match: "zakona o trgovačkim društvima" },
      { year: 2019, issue: 40, match: "zakona o trgovačkim društvima" },
      { year: 2022, issue: 34, match: "zakona o trgovačkim društvima" },
      { year: 2022, issue: 114, match: "zakona o trgovačkim društvima" },
      { year: 2023, issue: 18, match: "zakona o trgovačkim društvima" },
      { year: 2023, issue: 130, match: "zakona o trgovačkim društvima" },
    ],
  },
  {
    id: "zpp", short: "ZPP", title: "Zakon o parničnom postupku",
    base: { year: 2011, issue: 148, match: "zakon o parničnom postupku" },
    amendments: [
      { year: 2013, issue: 25, match: "zakona o parničnom postupku" },
      { year: 2019, issue: 70, match: "zakona o parničnom postupku" },
      { year: 2022, issue: 80, match: "zakona o parničnom postupku" },
      { year: 2022, issue: 114, match: "zakona o parničnom postupku" },
      { year: 2023, issue: 155, match: "zakona o parničnom postupku" },
    ],
  },
  {
    id: "zpgdpr", short: "ZPOUZP", title: "Zakon o provedbi Opće uredbe o zaštiti podataka",
    base: { year: 2018, issue: 42, match: "zakon o provedbi opće uredbe o zaštiti podataka" },
    amendments: [],
  },
  {
    id: "zzp", short: "ZZP", title: "Zakon o zaštiti potrošača",
    base: { year: 2022, issue: 19, match: "zakon o zaštiti potrošača" },
    amendments: [],
  },
  {
    id: "zzkpp", short: "ZZKPP", title: "Zakon o zakupu i kupoprodaji poslovnoga prostora",
    base: { year: 2011, issue: 125, match: "zakon o zakupu i kupoprodaji poslovnoga prostora" },
    amendments: [
      { year: 2015, issue: 64, match: "zakona o zakupu i kupoprodaji poslovnoga prostora" },
      { year: 2018, issue: 112, match: "zakona o zakupu i kupoprodaji poslovnoga prostora" },
    ],
  },
];

export const EU_ACTS = [
  { id: "gdpr", celex: "32016R0679", short: "GDPR", title: "Opća uredba o zaštiti podataka (EU) 2016/679" },
  { id: "unfair-terms", celex: "31993L0013", short: "Dir. 93/13", title: "Direktiva 93/13/EEZ o nepoštenim uvjetima u potrošačkim ugovorima" },
  { id: "late-payment", celex: "32011L0007", short: "Dir. 2011/7", title: "Direktiva 2011/7/EU o borbi protiv kašnjenja u plaćanju" },
  { id: "rome-i", celex: "32008R0593", short: "Rim I", title: "Uredba (EZ) br. 593/2008 (Rim I) o pravu mjerodavnom za ugovorne obveze" },
  { id: "brussels-ia", celex: "32012R1215", short: "Bruxelles I.a", title: "Uredba (EU) br. 1215/2012 o nadležnosti i priznavanju sudskih odluka" },
  { id: "consumer-rights", celex: "32011L0083", short: "Dir. 2011/83", title: "Direktiva 2011/83/EU o pravima potrošača" },
];

// Case-law harvest: the most relevant decisions per topic from odluke.sudovi.hr.
export const CASE_TOPICS = [
  "izvanredni otkaz rok saznanje",
  "poslovno uvjetovani otkaz savjetovanje radničko vijeće",
  "ugovorna kazna smanjenje",
  "zatezne kamate trgovački ugovor",
  "zastara potraživanja trgovački ugovor",
  "otkaz ugovora o zakupu poslovnog prostora",
  "odgovornost člana uprave društva s ograničenom odgovornošću",
  "naknada štete ugovorna odgovornost",
  "nepoštene ugovorne odredbe potrošač",
  "automatsko produljenje ugovora",
  "obrada osobnih podataka naknada štete",
  "prijeboj potraživanja",
];
export const CASES_PER_TOPIC = 6;

// Court of Justice of the EU: selected judgments (Croatian language versions from Cellar).
export const CJEU_CASES = [
  { celex: "62014CJ0362", ref: "C-362/14", name: "Schrems" },
  { celex: "62018CJ0311", ref: "C-311/18", name: "Facebook Ireland i Schrems (Schrems II)" },
  { celex: "62012CJ0131", ref: "C-131/12", name: "Google Spain i Google" },
  { celex: "62017CJ0673", ref: "C-673/17", name: "Planet49" },
  { celex: "62021CJ0300", ref: "C-300/21", name: "Österreichische Post" },
  { celex: "62021CJ0807", ref: "C-807/21", name: "Deutsche Wohnen" },
  { celex: "62018CJ0055", ref: "C-55/18", name: "CCOO" },
  { celex: "62016CJ0684", ref: "C-684/16", name: "Max-Planck-Gesellschaft zur Förderung der Wissenschaften" },
  { celex: "62014CJ0266", ref: "C-266/14", name: "Federación de Servicios Privados del sindicato Comisiones obreras (Tyco)" },
  { celex: "62013CJ0026", ref: "C-26/13", name: "Kásler i Káslerné Rábai" },
  { celex: "62016CJ0186", ref: "C-186/16", name: "Andriciuc i dr." },
  { celex: "62015CJ0154", ref: "C-154/15", name: "Gutiérrez Naranjo" },
  { celex: "62018CJ0260", ref: "C-260/18", name: "Dziubak" },
  { celex: "62017CJ0630", ref: "C-630/17", name: "Milivojević" },
  { celex: "62015CJ0551", ref: "C-551/15", name: "Pula Parking" },
  { celex: "62015CJ0484", ref: "C-484/15", name: "Zulfikarpašić" },
];

// European Court of Human Rights: judgments against Croatia (HUDOC metadata; full text opens on HUDOC).
export const ECHR_LIMIT = 80;
export const ECHR_ARTICLES = {
  "2": "pravo na život", "3": "zabrana mučenja", "5": "pravo na slobodu i sigurnost", "6": "pravo na pošteno suđenje",
  "8": "pravo na poštovanje privatnog i obiteljskog života", "10": "sloboda izražavanja", "11": "sloboda okupljanja i udruživanja",
  "13": "pravo na djelotvorni pravni lijek", "14": "zabrana diskriminacije", "P1-1": "zaštita vlasništva",
};

// Croatian Personal Data Protection Agency: decisions published on azop.hr.
export const AZOP_LISTING = "https://azop.hr/rjesenja/";
export const AZOP_LIMIT = 30;
