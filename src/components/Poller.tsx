"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Poller({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let stopped = false;
    const poll = setInterval(async () => {
      try {
        const r = await fetch(`/api/documents/${documentId}`, { cache: "no-store" });
        const d = await r.json();
        if (!stopped && (d.status === "analizirano" || d.status === "greska")) {
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
  }, [documentId, router]);

  return (
    <div className="card card-pad" style={{ textAlign: "center", padding: "48px 24px" }}>
      <div className="spinner" />
      <p style={{ fontWeight: 700, color: "var(--navy)", margin: "16px 0 4px" }}>
        Analiza dokumenta u tijeku…
      </p>
      <p className="muted" style={{ fontSize: 13 }}>
        Claude iščitava dokument i izdvaja sve podatke (n8n). Ovo obično traje 10–40 sekundi.
      </p>
      <p className="muted mono" style={{ fontSize: 12, marginTop: 10 }}>
        proteklo: {elapsed}s
      </p>
    </div>
  );
}
