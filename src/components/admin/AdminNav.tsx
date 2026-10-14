"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import Logo from "@/components/Logo";
import { ILock } from "@/components/Icons";

export default function AdminNav({ userName }: { userName: string }) {
  const path = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Odjava nije uspjela. Pokušajte ponovno.");
      window.location.assign("/prijava");
    } catch (err) { setError(err instanceof Error ? err.message : "Odjava nije uspjela."); setBusy(false); }
  }
  return <>
    <header className="admin-header">
      <Link href="/admin" className="admin-wordmark" aria-label="LTB Law administracija"><Logo size={34} /><span>LTB <strong>Law</strong><small>Administracija</small></span></Link>
      <div className="admin-header-account"><span>{userName}</span><button type="button" className="btn btn-sm" onClick={logout} disabled={busy}>{busy ? "Odjavljivanje…" : "Odjava"}</button></div>
    </header>
    <div className="admin-navigation"><nav className="admin-tabs" aria-label="Administracija"><Link href="/admin" aria-current={path === "/admin" ? "page" : undefined}>Pregled</Link><Link href="/admin/firms" aria-current={path.startsWith("/admin/firms") ? "page" : undefined}>Uredi</Link></nav><span className="admin-private"><ILock size={13} /> Privatna LTB administracija</span></div>
    {error && <div className="admin-notice error" role="alert">{error}</div>}
  </>;
}
