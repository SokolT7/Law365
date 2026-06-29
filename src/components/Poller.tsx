"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisMode } from "@/lib/types";

export default function Poller({
  documentId,
  mode,
}: {
  documentId: string;
  mode: AnalysisMode;
}) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let stopped = false;
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/documents/${documentId}`, { cache: "no-store" });
        const d = await r.json();
        const a = (d.analyses || []).find(
          (x: { mode: AnalysisMode; status: string }) => x.mode === mode
        );
        if (!stopped && a && (a.status === "analizirano" || a.status === "greska")) {
          clearInterval(poll);
          router.refresh();
        }
      } catch {
        /* nastavi prozivati */
      }
    }, 2000);
    const tick = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      stopped = true;
      clearInterval(poll);
      clearInterval(tick);
    };
  }, [documentId, mode, router]);

  return (
    <div className="card card-pad" style={{ textAlign: "center", padding: "48px 24px" }}>
      <div className="spinner" />
      <p style={{ fontWeight: 700, color: "var(--navy)", margin: "16px 0 4px" }}>
        Obrada dokumenta u tijeku…
      </p>
      <p className="muted" style={{ fontSize: 13 }}>
        Claude iščitava dokument (n8n). Ovo obično traje 10–40 sekundi.
      </p>
      <p className="muted mono" style={{ fontSize: 12, marginTop: 10 }}>
        proteklo: {elapsed}s
      </p>
    </div>
  );
}
