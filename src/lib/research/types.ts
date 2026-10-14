/** Client-safe types for research answers, their sources and the streaming protocol. */

export type SourceKind = "statute" | "case" | "eu" | "firm";

/** A source as it was when an answer was produced (snapshotted with the message for audit). */
export interface SourceRecord {
  /** Citation number used in the answer text as [n]. */
  n: number;
  id: string;
  kind: SourceKind;
  /** Catalogue id (rh-zakoni, rh-praksa, eu-propisi, vasi-dokumenti). */
  sourceId: string;
  /** Short pill label, e.g. "ZOR čl. 116." or "VSRH Revr-2341/2015-2". */
  label: string;
  title: string;
  ref?: string;
  heading?: string;
  /** The passage the answer relied on. */
  excerpt: string;
  url?: string;
  ecli?: string;
  court?: string;
  decidedAt?: string;
  decisionType?: string;
  /** Amending acts built into this article's consolidated text automatically (statutes only). */
  consolidatedWith?: string[];
  /** Amending instructions that could not be applied automatically and need a manual check. */
  pendingAmendments?: { citation: string; text: string }[];
  /** Legacy (messages saved before consolidation): amending acts that touched the original text. */
  amendedBy?: string[];
  versionNote?: string;
  documentId?: string;
  chunkId?: string;
}

export interface SearchStep {
  id: string;
  label: string;
  detail?: string;
  state: "running" | "done";
  count?: number;
}

export interface Verification {
  citedSources: number;
  totalSources: number;
  /** Markers like [9] that point at no source; removed from the text. */
  removedMarkers: string[];
  /** Paragraphs with factual content but no citation. */
  uncitedParagraphs: number;
  ok: boolean;
}

export interface DeadlineCalculation {
  label: string;
  start: string;
  days: number;
  end: string;
  /** End date moved to the next working day (weekend/holiday). */
  adjustedEnd?: string;
  adjustedReason?: string;
  rule: string;
}

export interface ResearchMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  ts: string;
  sources?: SourceRecord[];
  steps?: SearchStep[];
  verification?: Verification;
  calculation?: DeadlineCalculation;
  playbookId?: string;
  stopped?: boolean;
}

export interface ResearchThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  /** Threads are private to the user who started them. */
  createdById: string;
  clientId?: string;
  messages: ResearchMessage[];
}

export type StreamEvent =
  | { type: "thread"; threadId: string; messageId: string }
  | { type: "status"; step: SearchStep }
  | { type: "sources"; sources: SourceRecord[] }
  | { type: "delta"; text: string }
  | { type: "calculation"; calculation: DeadlineCalculation }
  | { type: "verification"; verification: Verification }
  | { type: "complete"; message: ResearchMessage }
  | { type: "error"; message: string };
