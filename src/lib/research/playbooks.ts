/** Firm playbooks: reusable research instructions. Built-ins ship with LTB; firm admins can add their own. */

export interface Playbook {
  id: string;
  name: string;
  description: string;
  /** Extra instructions appended to the research system prompt. */
  instructions: string;
  /** Acts to favour in retrieval (short names, e.g. "ZOR"). */
  preferActs?: string[];
  /** Expert prompt starters shown when the playbook is active. */
  starters?: string[];
  builtIn?: boolean;
  createdBy?: string;
}

export const BUILT_IN_PLAYBOOKS: Playbook[] = [
  {
    id: "radno-pravo", builtIn: true, name: "Radno pravo", preferActs: ["ZOR"],
    description: "Otkazi, rokovi, radničko vijeće i prava radnika prema Zakonu o radu.",
    instructions: "Usredotoči se na Zakon o radu i radnopravnu sudsku praksu. Uvijek izdvoji rokove (prekluzivne i otkazne) i postupovne korake poslodavca redoslijedom kojim se moraju poduzeti.",
    starters: [
      "Izradi hodogram izvanrednog otkaza zbog skrivljenog ponašanja radnika, s prekluzivnim rokom i obvezom savjetovanja s radničkim vijećem.",
      "Koja su prava radnika kod poslovno uvjetovanog otkaza i koji su otkazni rokovi?",
    ],
  },
  {
    id: "rizik-ugovora", builtIn: true, name: "Analiza rizika ugovora", preferActs: ["ZOO", "ZZP"],
    description: "Rizici ugovornih odredbi iz perspektive vašeg klijenta.",
    instructions: "Analiziraj iz perspektive klijenta ureda. Za svaki rizik navedi odredbu, posljedicu, vjerojatnost i konkretan prijedlog izmjene. Razlikuj dispozitivne i prisilne propise.",
    starters: [
      "Koji su rizici ugovorne kazne i kada je sud može smanjiti?",
      "Kako se ograničava odgovornost za štetu u ugovoru i gdje su granice prema ZOO-u?",
    ],
  },
  {
    id: "dopis-klijentu", builtIn: true, name: "Dopis klijentu",
    description: "Pretvara pravne nalaze u jasan dopis klijentu.",
    instructions: "Odgovor oblikuj kao dopis klijentu: jednostavan jezik bez žargona, kratki odlomci, jasna preporuka i sljedeći koraci. Zadrži oznake izvora [n] uz tvrdnje kako bi ih odvjetnik mogao provjeriti prije slanja.",
    starters: ["Objasni klijentu kada zastarijevaju njegove tražbine iz trgovačkih ugovora i što treba poduzeti."],
  },
  {
    id: "zastita-podataka", builtIn: true, name: "Zaštita podataka (GDPR)", preferActs: ["GDPR", "ZPOUZP"],
    description: "Zakonitost obrade, prava ispitanika, prijenosi i novčane kazne.",
    instructions: "Usredotoči se na Opću uredbu o zaštiti podataka i Zakon o provedbi Opće uredbe. Navedi pravnu osnovu obrade, obveze voditelja obrade i rizik upravnih novčanih kazni.",
    starters: ["Koje su pravne osnove za obradu osobnih podataka zaposlenika i kada je potrebna privola?"],
  },
  {
    id: "trgovacka-drustva", builtIn: true, name: "Trgovačka društva", preferActs: ["ZTD"],
    description: "Uprava, skupština, odgovornost i statusna pitanja prema ZTD-u.",
    instructions: "Usredotoči se na Zakon o trgovačkim društvima; razlikuj d.o.o. i d.d. i navedi odgovarajuće odredbe za svaki oblik.",
    starters: ["Kada članovi uprave d.o.o. osobno odgovaraju za štetu društvu?"],
  },
];

export function allPlaybooks(custom: Playbook[] = []): Playbook[] {
  return [...BUILT_IN_PLAYBOOKS, ...custom];
}

export function findPlaybook(id: string | undefined, custom: Playbook[] = []): Playbook | undefined {
  return id ? allPlaybooks(custom).find((p) => p.id === id) : undefined;
}

/** Expanding prompt starters for the empty research screen. */
export const RESEARCH_STARTERS: { group: string; items: { title: string; prompt: string }[] }[] = [
  { group: "Radno pravo", items: [
    { title: "Izvanredni otkaz — hodogram", prompt: "Izradi detaljan hodogram izvanrednog otkaza ugovora o radu zbog skrivljenog ponašanja radnika, s naglaskom na prekluzivni rok od dana saznanja i obvezu savjetovanja s radničkim vijećem. Navedi rokove u tablici." },
    { title: "Poslovno uvjetovani otkaz", prompt: "Koji su uvjeti za zakonit poslovno uvjetovani otkaz, koje su obveze poslodavca prema radničkom vijeću i koji otkazni rokovi vrijede?" },
  ] },
  { group: "Obvezno pravo", items: [
    { title: "Smanjenje ugovorne kazne", prompt: "Kada sud može smanjiti ugovornu kaznu, tko to mora zatražiti i kako se ugovorna kazna odnosi prema naknadi štete? Navedi i relevantnu sudsku praksu." },
    { title: "Zastara u trgovačkim ugovorima", prompt: "U kojem roku zastarijevaju međusobne tražbine iz trgovačkih ugovora, kada rok počinje teći i čime se prekida zastara?" },
  ] },
  { group: "Europsko pravo", items: [
    { title: "Pravna osnova obrade (GDPR)", prompt: "Koje su pravne osnove za zakonitu obradu osobnih podataka prema članku 6. GDPR-a i kada voditelj obrade ne smije koristiti privolu?" },
    { title: "Nepoštene odredbe potrošačkih ugovora", prompt: "Kada se ugovorna odredba u potrošačkom ugovoru smatra nepoštenom i koje su posljedice prema Direktivi 93/13 i hrvatskom pravu?" },
  ] },
];
