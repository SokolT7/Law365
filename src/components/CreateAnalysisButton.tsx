"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisMode } from "@/lib/types";

export default function CreateAnalysisButton({
  documentId,
  mode,
  label,
}: {
  documentId: string;
  mode: AnalysisMode;
  label: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    try {
      await fetch(`/api/documents/${documentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      router.push(`/dokumenti/${documentId}?prikaz=${mode}`);
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <button className="tab tab-add" onClick={create} disabled={busy}>
      {busy ? "Pokrećem…" : `+ Izradi ${label}`}
    </button>
  );
}
