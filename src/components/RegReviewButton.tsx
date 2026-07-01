"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RegReviewButton({
  id,
  reviewed,
}: {
  id: string;
  reviewed: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    try {
      await fetch("/api/propisi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reviewed: !reviewed }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className={`btn btn-sm${reviewed ? " btn-ghost" : ""}`} onClick={toggle} disabled={busy}>
      {busy ? "…" : reviewed ? "Vrati u nepregledano" : "Označi pregledano"}
    </button>
  );
}
