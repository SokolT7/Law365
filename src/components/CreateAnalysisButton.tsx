"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { AnalysisMode } from "@/lib/types";
import { Button } from "@/components/Button";
import { IPlus } from "@/components/Icons";

export default function CreateAnalysisButton({ documentId, mode, label, variant = "tab" }: { documentId: string; mode: AnalysisMode; label: string; variant?: "tab" | "action" }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function create() {
    if (busy) return; setBusy(true); setError("");
    try {
      const res = await fetch(`/api/documents/${documentId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Obrada nije pokrenuta.");
      router.push(`/dokumenti/${documentId}?analiza=${mode}`, { scroll: false }); router.refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Obrada nije pokrenuta."); setBusy(false); }
  }
  return <div>
    {variant === "action"
      ? <button className="action-card action-create" onClick={create} disabled={busy}><span className="ac-plus"><IPlus size={16} aria-hidden="true" /></span><span className="ac-main"><span className="ac-title">{label}</span><span className="ac-sub">{busy ? "Pokrećem…" : "Pokreni obradu"}</span></span></button>
      : <Button variant="primary" icon={<IPlus />} loading={busy} onClick={create}>{`Pokreni ${label.toLocaleLowerCase("hr")}`}</Button>}
    {error && <p className="flash err section-gap" role="alert">{error}</p>}
  </div>;
}
