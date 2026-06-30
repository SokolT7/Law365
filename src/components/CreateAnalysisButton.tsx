"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisMode } from "@/lib/types";

export default function CreateAnalysisButton({
  documentId,
  mode,
  label,
  variant = "tab",
}: {
  documentId: string;
  mode: AnalysisMode;
  label: string;
  variant?: "tab" | "action";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create() {
    // otvori prozor sinkrono u kliku (izbjegava blokadu skočnih prozora)
    const win = variant === "action" ? window.open("", "_blank") : null;
    setBusy(true);
    try {
      await fetch(`/api/documents/${documentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const url = `/dokumenti/${documentId}?analiza=${mode}`;
      if (win) {
        win.location.href = url;
        router.refresh();
      } else {
        router.push(url);
        router.refresh();
      }
    } catch {
      if (win) win.close();
      setBusy(false);
    }
  }

  if (variant === "action") {
    return (
      <button className="action-card action-create" onClick={create} disabled={busy}>
        <span className="ac-plus">＋</span>
        <span className="ac-main">
          <span className="ac-title">{label}</span>
          <span className="ac-sub">{busy ? "Pokrećem…" : "Pokreni obradu"}</span>
        </span>
      </button>
    );
  }

  return (
    <button className="tab tab-add" onClick={create} disabled={busy}>
      {busy ? "Pokrećem…" : `+ Izradi ${label}`}
    </button>
  );
}
