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
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function toggle() {
    setBusy(true);
    setError(""); setMessage("");
    try {
      const response = await fetch("/api/propisi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, reviewed: !reviewed }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Promjena nije spremljena. Pokušajte ponovno.");
      }
      setMessage(reviewed ? "Vraćeno u nepregledano." : "Označeno kao pregledano.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Promjena nije spremljena. Provjerite vezu i pokušajte ponovno.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="review-action"><button aria-busy={busy} className={`btn btn-sm${reviewed ? " btn-ghost" : ""}`} onClick={toggle} disabled={busy}>
      {busy ? "Spremanje…" : reviewed ? "Vrati u nepregledano" : "Označi pregledano"}
    </button>{error && <p className="review-error" role="alert">{error}</p>}{message && <span className="sr-only" role="status">{message}</span>}</div>
  );
}
