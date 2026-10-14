"use client";

import { useState } from "react";
import { IArrowRight, IShield, IUsers } from "@/components/Icons";

type Choice = { role: "firm" | "admin"; title: string; description: string; Icon: typeof IUsers };

/** Demo-only sign-in: one click as the firm user or the LTB administrator. */
export default function DemoLogin({ firm, admin }: { firm: { name: string; firm: string } | null; admin: { name: string } | null }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const choices: Choice[] = [
    firm && { role: "firm" as const, title: "Uđi kao ured", description: `${firm.firm} · ${firm.name}`, Icon: IUsers },
    admin && { role: "admin" as const, title: "Uđi kao administrator", description: "LTB administracija · uredi, korisnici i funkcije", Icon: IShield },
  ].filter(Boolean) as Choice[];

  async function enter(role: Choice["role"]) {
    setBusy(role); setError("");
    try {
      const response = await fetch("/api/auth/demo", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Prijava nije uspjela.");
      window.location.assign(result.redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Prijava nije uspjela.");
      setBusy(null);
    }
  }

  return (
    <div className="auth-content">
      <p className="auth-kicker">LTB Law · Demonstracija</p>
      <h2 className="auth-title">Odaberite ulogu.</h2>
      <p className="auth-description">Demo radni prostor s izmišljenim podacima. Prijava lozinkom nije potrebna.</p>
      <div className="demo-choices">
        {choices.map(({ role, title, description, Icon }) => (
          <button key={role} type="button" className="demo-choice" onClick={() => enter(role)} disabled={!!busy} aria-busy={busy === role}>
            <span className="demo-choice-icon" aria-hidden="true"><Icon /></span>
            <span className="demo-choice-text"><b>{title}</b><span>{description}</span></span>
            {busy === role ? <span className="btn-spinner" aria-hidden="true" /> : <IArrowRight className="demo-choice-arrow" aria-hidden="true" />}
          </button>
        ))}
      </div>
      {error && <div className="admin-notice error" role="alert">{error}</div>}
      <div className="auth-help"><p>Demo način rada uključen je samo lokalno. U stvarnoj instalaciji pristup se dodjeljuje pozivnicom i lozinkom.</p></div>
    </div>
  );
}
