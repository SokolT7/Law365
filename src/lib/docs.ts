import type {
  AnalysisMode,
  Analysis,
  DB,
  DocStatus,
  DocumentRec,
  ExtractionResult,
} from "@/lib/types";

export const MODES: AnalysisMode[] = ["sazetak", "detaljna"];

export const MODE_LABEL: Record<AnalysisMode, string> = {
  sazetak: "Sažetak",
  detaljna: "Detaljna analiza",
};

export function analysisOf(doc: DocumentRec, mode: AnalysisMode): Analysis | undefined {
  return doc.analyses.find((a) => a.mode === mode);
}

/** Rekonstruira tekst dokumenta iz spremljenih ulomaka (za ponovnu obradu). */
export function documentText(db: DB, docId: string): string {
  return db.chunks
    .filter((c) => c.documentId === docId)
    .sort((a, b) => a.index - b.index)
    .map((c) => c.text)
    .join("\n\n");
}

/** Rezultat koji se koristi za prikaz na nadzornoj ploči: detaljna ako postoji, inače sažetak. */
export function primaryResult(doc: DocumentRec): ExtractionResult | undefined {
  const done = doc.analyses.filter((a) => a.status === "analizirano" && a.result);
  const det = done.find((a) => a.mode === "detaljna");
  return (det ?? done[0])?.result;
}

/** Ukupni status dokumenta iz svih obrada. */
export function overallStatus(doc: DocumentRec): DocStatus {
  if (doc.analyses.some((a) => a.status === "analizirano")) return "analizirano";
  if (doc.analyses.some((a) => a.status === "u_obradi")) return "u_obradi";
  return "greska";
}
