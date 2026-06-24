export type Severity = "visoka" | "srednja" | "niska";
export type DocStatus = "analizirano" | "u_obradi";
export type FindingStatus = "otvoren" | "odobren" | "odbacen";
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

export interface KeyTerm {
  id: string;
  documentId: string;
  label: string;
  value: string;
  chunkId?: string;
}

export interface Obligation {
  id: string;
  documentId: string;
  text: string;
  dueDate?: string;
  chunkId?: string;
}

export interface Finding {
  id: string;
  documentId: string;
  ruleId: string;
  title: string;
  detail: string;
  severity: Severity;
  status: FindingStatus;
  chunkId?: string;
}

export interface DocumentRec {
  id: string;
  title: string;
  filename: string;
  type: string;
  clientId: string;
  matterId: string;
  status: DocStatus;
  createdAt: string;
  summary: string;
  mode: Mode;
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
  keyTerms: KeyTerm[];
  obligations: Obligation[];
  findings: Finding[];
  audit: AuditEvent[];
}

/** Result of analysing a single contract (ids/documentId assigned by the pipeline). */
export interface AnalysisResult {
  type: string;
  summary: string;
  keyTerms: { label: string; value: string; chunkId?: string }[];
  obligations: { text: string; dueDate?: string; chunkId?: string }[];
  findings: {
    ruleId: string;
    title: string;
    detail: string;
    severity: Severity;
    chunkId?: string;
  }[];
}
