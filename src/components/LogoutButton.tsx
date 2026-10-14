"use client";
import { useState } from "react";
export default function LogoutButton({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Odjava nije uspjela. Pokušajte ponovno.");
      window.location.assign("/prijava");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Odjava nije uspjela.");
      setBusy(false);
    }
  }
  return <div><button type="button" className={compact ? "logout-button" : "btn"} onClick={logout} disabled={busy} aria-label="Odjava" title="Odjava">
    {compact ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" strokeLinecap="round" strokeLinejoin="round" /></svg> : busy ? "Odjavljivanje…" : "Odjavi se"}
  </button>{error && <p role="alert" className="flash err">{error}</p>}</div>;
}
