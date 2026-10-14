"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { PublicUser } from "@/lib/platform";
import { useConfirm, useToast } from "@/components/Feedback";

type Invitation = { invitationUrl: string; expiresAt: string; email: string };
const STATUS: Record<string, string> = { invited: "Pozvan", active: "Aktivan", disabled: "Onemogućen" };

export default function UserManager({ firmId, users }: { firmId: string; users: PublicUser[] }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const form = useRef<HTMLFormElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);

  async function request(url: string, method: string, body: unknown, key: string) {
    setBusy(key); setError(""); setNotice(""); setCopied(false);
    try {
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Promjena nije spremljena. Pokušajte ponovno.");
      if (result.invitationUrl) setInvitation({ invitationUrl: result.invitationUrl, expiresAt: result.expiresAt, email: result.user.email });
      else { setInvitation(null); setNotice("Promjena je spremljena."); toast({ message: "Promjena je spremljena." }); }
      router.refresh();
      return true;
    } catch (err) { setError(err instanceof Error ? err.message : "Veza nije uspjela. Pokušajte ponovno."); return false; }
    finally { setBusy(null); }
  }

  async function invite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    if (await request("/api/admin/users", "POST", { firmId, name: data.get("name"), email: data.get("email"), role: data.get("role") }, "new")) form.current?.reset();
  }

  async function update(user: PublicUser, change: Record<string, string>) {
    if (change.status === "disabled" && !(await confirm({ title: `Onemogućiti pristup za ${user.name}?`, body: "Korisnik će odmah biti odjavljen, a njegove pozivnice opozvane.", confirmLabel: `Onemogući ${user.name}`, destructive: true }))) return;
    if (change.action === "revoke_invitation" && !(await confirm({ title: `Opozvati pozivnicu za ${user.name}?`, body: "Postojeća poveznica više neće vrijediti.", confirmLabel: "Opozovi pozivnicu", destructive: true }))) return;
    if (change.action === "invite" && !(await confirm({ title: `Izraditi novu poveznicu za ${user.name}?`, body: `Sve prethodne neiskorištene poveznice bit će opozvane.${user.status === "disabled" ? " Korisnik će ponovno dobiti mogućnost aktivacije računa." : ""}`, confirmLabel: "Izradi poveznicu" }))) return;
    await request(`/api/admin/users/${user.id}`, "PATCH", change, user.id);
  }

  async function copyInvitation() {
    if (!invitation) return;
    try { await navigator.clipboard.writeText(invitation.invitationUrl); setCopied(true); }
    catch { setError("Kopiranje nije dostupno. Označite i ručno kopirajte poveznicu ispod."); }
  }

  return <section className="admin-panel" id="korisnici">
    <div className="admin-section-heading"><div><p className="eyebrow">Korisnički pristup</p><h2>Ljudi u ovom uredu</h2></div><span className="admin-status">{users.length} korisnika</span></div>
    <p className="admin-section-description">Korisnici sami postavljaju lozinku kroz jednokratnu poveznicu. Pozivnice dostavite osobno ili dogovorenim sigurnim kanalom.</p>
    <form className="admin-user-form" ref={form} onSubmit={invite} aria-busy={busy === "new"}><label className="admin-field"><span>Ime i prezime</span><input name="name" required maxLength={160} autoComplete="off" placeholder="Ime i prezime" /></label><label className="admin-field"><span>Poslovna e-adresa</span><input name="email" type="email" required maxLength={254} autoComplete="off" placeholder="ime@ured.hr" /></label><label className="admin-field"><span>Uloga</span><select name="role" defaultValue="member"><option value="member">Član ureda</option><option value="firm_admin">Administrator ureda</option></select></label><button className="btn btn-primary" disabled={busy !== null} type="submit">{busy === "new" ? "Izrada pozivnice…" : "Dodaj i pozovi"}</button></form>
    <p className="admin-section-description">Administrator ureda može uređivati postavke izvora. Korisnicima i dostupnim funkcijama upravlja LTB.</p>
    {error && <div className="admin-notice error" role="alert">{error}</div>}{notice && <div className="admin-notice success" role="status">{notice}</div>}
    {invitation && <div className="admin-invitation" role="status"><div><strong>Pozivnica je spremna za {invitation.email}</strong><p>Poveznica nije poslana e-poštom. Vrijedi do {new Date(invitation.expiresAt).toLocaleString("hr-HR", { timeZone: "Europe/Zagreb" })} (Zagreb) i može se upotrijebiti jednom.</p></div><label className="admin-field"><span>Poveznica za aktivaciju</span><input readOnly value={invitation.invitationUrl} onFocus={(event) => event.target.select()} /></label><button className="btn btn-sm" type="button" onClick={copyInvitation}>{copied ? "Poveznica kopirana" : "Kopiraj poveznicu"}</button><small>Poveznicu kopirajte prije napuštanja stranice. Poslije možete izraditi novu.</small></div>}
    {users.length ? <div className="admin-user-list">{users.map((user) => <article className="admin-user-row" key={user.id}><div className="admin-user-identity"><span className="admin-firm-monogram">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("").toLocaleUpperCase("hr-HR")}</span><div><strong>{user.name}</strong><small>{user.email}</small><span className={`admin-status ${user.status}`}>{STATUS[user.status]}</span></div></div><label className="admin-field"><span className="sr-only">Uloga za {user.name}</span><select value={user.role} disabled={busy !== null} onChange={(event) => update(user, { role: event.target.value })}><option value="member">Član ureda</option><option value="firm_admin">Administrator ureda</option></select></label><div className="admin-user-actions"><button className="btn btn-sm" type="button" disabled={busy !== null} onClick={() => update(user, { action: "invite" })}>{busy === user.id ? "Spremanje…" : user.status === "active" ? "Obnova lozinke" : user.status === "disabled" ? "Ponovno pozovi" : "Nova pozivnica"}</button>{user.status === "invited" && <button className="btn btn-sm" type="button" disabled={busy !== null} onClick={() => update(user, { action: "revoke_invitation" })}>Opozovi pozivnicu</button>}{user.status !== "disabled" && <button className="btn btn-sm btn-danger" type="button" disabled={busy !== null} onClick={() => update(user, { status: "disabled" })}>Onemogući</button>}</div></article>)}</div> : <div className="admin-empty"><h3>Dodajte prvog korisnika.</h3><p>Nakon prihvaćanja poziva i aktivacije ureda korisnik može pristupiti svom radnom prostoru.</p></div>}
  </section>;
}
