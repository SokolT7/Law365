import Link from "next/link";
import type { AnalysisMode, DocumentRec } from "@/lib/types";
import { MODES, MODE_LABEL, analysisOf } from "@/lib/docs";
import CreateAnalysisButton from "@/components/CreateAnalysisButton";

const DOT: Record<string, string> = {
  analizirano: "lo",
  u_obradi: "mid",
  greska: "hi",
};

export default function ModeTabs({
  doc,
  active,
}: {
  doc: DocumentRec;
  active: AnalysisMode;
}) {
  return (
    <div className="tabs">
      {MODES.map((m) => {
        const a = analysisOf(doc, m);
        if (!a) {
          return (
            <CreateAnalysisButton key={m} documentId={doc.id} mode={m} label={MODE_LABEL[m]} />
          );
        }
        return (
          <Link
            key={m}
            href={`/dokumenti/${doc.id}?prikaz=${m}`}
            className={`tab${m === active ? " active" : ""}`}
          >
            <span className={`tab-dot ${DOT[a.status]}`} />
            {MODE_LABEL[m]}
          </Link>
        );
      })}
    </div>
  );
}
