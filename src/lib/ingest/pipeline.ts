import { randomUUID } from "crypto";
import { chunkContract } from "@/lib/ingest/chunk";
import { analyzeContract } from "@/lib/ai/analyze";
import type {
  Chunk,
  DocumentRec,
  Finding,
  KeyTerm,
  Mode,
  Obligation,
} from "@/lib/types";

export interface IngestInput {
  title: string;
  filename: string;
  text: string;
  clientId: string;
  matterId: string;
  mode: Mode;
}

export interface IngestOutput {
  document: DocumentRec;
  chunks: Chunk[];
  keyTerms: KeyTerm[];
  obligations: Obligation[];
  findings: Finding[];
}

/**
 * Cjevovod obrade (ekvivalent n8n toka):
 * parsiraj → podijeli na klauzule → indeksiraj → klasificiraj → izvuci → pregledaj.
 */
export async function ingestContract(input: IngestInput): Promise<IngestOutput> {
  const docId = randomUUID();

  const raw = chunkContract(input.text);
  const chunks: Chunk[] = raw.map((c, i) => ({
    id: randomUUID(),
    documentId: docId,
    index: i,
    heading: c.heading,
    text: c.text,
  }));

  const analysis = await analyzeContract(input.text, chunks, input.mode);

  const keyTerms: KeyTerm[] = analysis.keyTerms.map((k) => ({
    id: randomUUID(),
    documentId: docId,
    ...k,
  }));
  const obligations: Obligation[] = analysis.obligations.map((o) => ({
    id: randomUUID(),
    documentId: docId,
    ...o,
  }));
  const findings: Finding[] = analysis.findings.map((f) => ({
    id: randomUUID(),
    documentId: docId,
    status: "otvoren",
    ...f,
  }));

  const document: DocumentRec = {
    id: docId,
    title: input.title,
    filename: input.filename,
    type: analysis.type,
    clientId: input.clientId,
    matterId: input.matterId,
    status: "analizirano",
    createdAt: new Date().toISOString(),
    summary: analysis.summary,
    mode: input.mode,
  };

  return { document, chunks, keyTerms, obligations, findings };
}
