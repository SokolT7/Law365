import Link from "next/link";
import type { AnalysisMode, DocumentRec } from "@/lib/types";
import { MODES, MODE_LABEL, analysisOf } from "@/lib/docs";
import CreateAnalysisButton from "@/components/CreateAnalysisButton";
import { ISummary, IDocs } from "@/components/Icons";

const ICON: Record<AnalysisMode, (p: { size?: number }) => React.ReactElement> = {
  sazetak: ISummary,
  detaljna: IDocs,
};

export default function AnalysisActions({ doc }: { doc: DocumentRec }) {
  return (
    <div className="actions-row">
      {MODES.map((m) => {
        const a = analysisOf(doc, m);
        const Icon = ICON[m];
        if (!a) {
          return <CreateAnalysisButton key={m} documentId={doc.id} mode={m} label={MODE_LABEL[m]} variant="action" />;
        }
        const dot = a.status === "analizirano" ? "lo" : a.status === "u_obradi" ? "mid" : "hi";
        const sub =
          a.status === "analizirano"
            ? "Otvori u zasebnom prozoru ↗"
            : a.status === "u_obradi"
            ? "U obradi…"
            : "Nije uspjelo — pokušaj ponovno";
        return (
          <Link
            key={m}
            href={`/dokumenti/${doc.id}?analiza=${m}`}
            className="action-card"
            target="_blank"
            rel="noopener"
          >
            <span className="ac-icon"><Icon size={17} /></span>
            <span className="ac-main">
              <span className="ac-title">{MODE_LABEL[m]}</span>
              <span className="ac-sub"><span className={`tab-dot ${dot}`} /> {sub}</span>
            </span>
          </Link>
        );
      })}
    </div>
  );
}
