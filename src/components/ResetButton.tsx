"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IReset } from "@/components/Icons";

export default function ResetButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reset() {
    setBusy(true);
    await fetch("/api/seed", { method: "POST" });
    router.refresh();
    setBusy(false);
  }

  return (
    <button className="btn btn-sm" onClick={reset} disabled={busy} title="Vraća demo na početno stanje">
      <IReset size={14} /> {busy ? "Učitavanje…" : "Ponovno učitaj demo"}
    </button>
  );
}
