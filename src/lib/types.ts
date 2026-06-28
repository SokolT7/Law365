export type DocStatus = "u_obradi" | "analizirano" | "greska";
export type Mode = "demo" | "live";

export interface Firm {
  id: string;
  name: string;
}
export interface User {
  id: string;
  name: string;
  role: string;
}
export interface Client {
  id: string;
  name: string;
  sector: string;
}
export interface Matter {
  id: string;
  clientId: string;
  title: string;
  type: string;
}
export interface Chunk {
  id: string;
  documentId: string;
  index: number;
  heading: string;
  text: string;
}

/* ---------- Iscrpna ekstrakcija dokumenta (rezultat Claudea preko n8n) ---------- */

/** Izvor pojedine činjenice — članak i/ili doslovni navod. */
export interface Izvor {
  clanak?: string;
  citat?: string;
}
export interface StranaItem {
  naziv: string;
  uloga?: string;
  oib?: string;
  adresa?: string;
  izvor?: Izvor;
}
export interface ClanakItem {
  naslov: string;
  sazetak: string;
  izvor?: Izvor;
}
export interface TermItem {
  naziv: string;
  vrijednost: string;
  izvor?: Izvor;
}
export interface IznosItem {
  opis: string;
  iznos: string;
  valuta?: string;
  izvor?: Izvor;
}
export interface DatumItem {
  opis: string;
  datum?: string;
  vrsta?: string;
  izvor?: Izvor;
}
export interface ObvezaItem {
  strana?: string;
  opis: string;
  rok?: string;
  izvor?: Izvor;
}
export interface PravoItem {
  strana?: string;
  opis: string;
  izvor?: Izvor;
}
export interface ReferencaItem {
  propis: string;
  izvor?: Izvor;
}
export interface NapomenaItem {
  opis: string;
  izvor?: Izvor;
}

export interface ExtractionResult {
  vrsta: string;
  sazetak: string;
  strane: StranaItem[];
  odredbePoClancima: ClanakItem[];
  kljucniUvjeti: TermItem[];
  iznosi: IznosItem[];
  datumiIRokovi: DatumItem[];
  obveze: ObvezaItem[];
  prava: PravoItem[];
  mjerodavnoPravo?: { pravo: string; izvor?: Izvor };
  nadleznost?: { opis: string; izvor?: Izvor };
  prestanak?: { opis: string; otkazniRok?: string; izvor?: Izvor };
  reference: ReferencaItem[];
  napomene: NapomenaItem[];
}

export interface DocumentRec {
  id: string;
  jobId: string;
  title: string;
  filename: string;
  type: string; // vrsta (popunjava se iz rezultata kad stigne)
  clientId: string;
  matterId: string;
  status: DocStatus;
  createdAt: string;
  mode: Mode;
  result?: ExtractionResult;
  error?: string;
}

export interface AuditEvent {
  id: string;
  ts: string;
  actor: string;
  action: string;
  target: string;
}

export interface DB {
  firm: Firm;
  user: User;
  clients: Client[];
  matters: Matter[];
  documents: DocumentRec[];
  chunks: Chunk[];
  audit: AuditEvent[];
}

/* ---------- Ugovor između nadzorne ploče i n8n-a ---------- */

export interface ExtractionRequest {
  v: 1;
  jobId: string;
  documentId: string;
  language: "hr";
  filename: string;
  text: string;
  callbackUrl: string;
  meta: { firm: string; uploadedBy: string };
}

export interface ExtractionCallback {
  v: 1;
  jobId: string;
  documentId: string;
  status: "ok" | "error";
  model?: string;
  result?: ExtractionResult;
  usage?: unknown;
  error?: string | null;
}
