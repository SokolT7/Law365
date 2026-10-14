"use client";

import { useState } from "react";
import Link from "next/link";
import { ILock } from "@/components/Icons";

export default function AuthForm({ token, configured = true, awaitingActivation = false }: { token?: string; configured?: boolean; awaitingActivation?: boolean }) {
  const invitation = token !== undefined;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") || "");
    if (invitation && password !== data.get("confirmation")) {
      setError("Lozinke se ne podudaraju. Unesite ih ponovno.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const response = await fetch(invitation ? "/api/auth/accept-invitation" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(invitation ? { token, password } : { email: data.get("email"), password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Prijava nije uspjela. Pokušajte ponovno.");
      window.location.assign(result.redirect === "/admin" ? "/admin" : result.redirect === "/prijava?aktivacija=cekanje" ? result.redirect : "/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Veza nije uspjela. Pokušajte ponovno.");
      setBusy(false);
    }
  }

  return (
    <div className="auth-content">
      <p className="auth-kicker">LTB Law · {invitation ? "Aktivacija računa" : "Pristup uredu"}</p>
      <h2 className="auth-title">{invitation ? "Dobro došli u svoj radni prostor." : "Dobro došli natrag."}</h2>
      <p className="auth-description">{invitation ? "Postavite osobnu lozinku kako biste dovršili poziv i pristupili svom računu." : "Prijavite se računom koji vam je dodijelio LTB administrator."}</p>
      {awaitingActivation && <div className="admin-notice success" role="status">Lozinka je spremljena. Vaš ured je još u pripremi; pristup će biti dostupan nakon što ga LTB administrator aktivira.</div>}
      {!configured ? (
        <div className="admin-notice" role="status"><ILock size={20} /><div><strong>Radni prostor je u pripremi.</strong><p>Pristup će biti dostupan nakon što LTB administrator dovrši početno postavljanje sustava.</p></div></div>
      ) : (
        <form className="auth-form" onSubmit={submit} aria-busy={busy}>
          {!invitation && <label className="admin-field"><span>Poslovna e-adresa</span><input name="email" type="email" autoComplete="username" placeholder="ime@vas-ured.hr" required autoFocus /></label>}
          <label className="admin-field"><span>{invitation ? "Nova lozinka" : "Lozinka"}</span><input name="password" type={visible ? "text" : "password"} autoComplete={invitation ? "new-password" : "current-password"} minLength={invitation ? 12 : undefined} required autoFocus={invitation} aria-describedby={invitation ? "password-guidance" : undefined} /></label>
          {invitation && <><p id="password-guidance" className="auth-field-help">Najmanje 12 znakova. Upotrijebite jedinstvenu lozinku koju ne koristite na drugim mjestima.</p><label className="admin-field"><span>Ponovite novu lozinku</span><input name="confirmation" type={visible ? "text" : "password"} autoComplete="new-password" minLength={12} required /></label></>}
          <label className="auth-show-password"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} /> Prikaži lozinku</label>
          {error && <div id="auth-error" className="admin-notice error" role="alert">{error}</div>}
          <button className="btn btn-primary" disabled={busy} type="submit">{busy ? (invitation ? "Aktiviranje računa…" : "Prijavljivanje…") : (invitation ? "Aktiviraj račun" : "Prijavi se")}<span aria-hidden="true">→</span></button>
        </form>
      )}
      <div className="auth-help">{invitation ? <Link href="/prijava">Već imate račun? Prijavite se</Link> : <p>Za pristup ili obnovu lozinke obratite se svojoj kontakt-osobi u LTB timu. Pristup se dodjeljuje pojedinačno.</p>}</div>
    </div>
  );
}
