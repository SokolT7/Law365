"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FirmRecord } from "@/lib/platform";
import { FEATURE_CATALOG, FEATURE_PRESETS, type FeatureKey } from "@/lib/features";
import { useConfirm, useToast } from "@/components/Feedback";

const ACCENTS = [
  { value: "#3D5FE5", label: "LTB plava" },
  { value: "#806644", label: "Brončana" }, { value: "#48645B", label: "Zelena" }, { value: "#4E6178", label: "Plava" },
  { value: "#775653", label: "Bordo" }, { value: "#615A73", label: "Ljubičasta" }, { value: "#59656E", label: "Siva" },
];
const STATUS: Record<string, string> = { draft: "U pripremi", active: "Aktivan", suspended: "Suspendiran" };

export default function FirmEditor({ firm }: { firm?: FirmRecord }) {
  const router = useRouter();
  const confirm = useConfirm();
  const toast = useToast();
  const [name, setName] = useState(firm?.name || "");
  const [legalName, setLegalName] = useState(firm?.legalName || "");
  const [accent, setAccent] = useState(firm?.accent || ACCENTS[0].value);
  const [greeting, setGreeting] = useState(firm?.greeting || "Vaš radni dan, na jednom mjestu.");
  const [features, setFeatures] = useState<FeatureKey[]>(firm?.features || [...FEATURE_PRESETS.core]);
  const [status, setStatus] = useState<FirmRecord["status"]>(firm?.status || "draft");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function toggleFeature(key: FeatureKey) {
    setSuccess("");
    if (features.includes(key)) {
      const affected = FEATURE_CATALOG.filter((feature) => feature.requires.some((dependency) => dependency === key) && features.includes(feature.key));
      if (affected.length && !(await confirm({ title: `Isključiti „${FEATURE_CATALOG.find((feature) => feature.key === key)?.label}”?`, body: <p>Isključit će se i ovisne funkcije: <b>{affected.map((feature) => feature.label).join(", ")}</b>. Podaci ostaju sačuvani.</p>, confirmLabel: "Isključi funkcije" }))) return;
      setFeatures(features.filter((feature) => feature !== key && !affected.some((item) => item.key === feature)));
    } else {
      const required = FEATURE_CATALOG.find((feature) => feature.key === key)?.requires || [];
      setFeatures([...new Set([...features, ...required, key])]);
    }
  }

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (firm && firm.status !== status && status !== "active" && !(await confirm({ title: `Postaviti ured na „${STATUS[status]}”?`, body: <p>Svi korisnici ureda <b>{firm.name}</b> odmah gube pristup. Postojeći podaci ostaju sačuvani.</p>, confirmLabel: `Postavi „${STATUS[status]}”`, destructive: true }))) return;
    const removed = firm?.features.filter((key) => !features.includes(key)) || [];
    if (removed.length && !(await confirm({ title: "Ukloniti funkcije korisnicima?", body: <p>Sljedeće funkcije više neće biti dostupne: <b>{removed.map((key) => FEATURE_CATALOG.find((feature) => feature.key === key)?.label || key).join(", ")}</b>. Postojeći podaci ostaju sačuvani.</p>, confirmLabel: "Spremi promjene", destructive: true }))) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const response = await fetch(firm ? `/api/admin/firms/${firm.id}` : "/api/admin/firms", { method: firm ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), legalName: legalName.trim(), accent, greeting: greeting.trim(), features, status }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Ured nije spremljen. Pokušajte ponovno.");
      if (!firm) router.push(`/admin/firms/${result.firm.id}?created=1#korisnici`);
      else { setSuccess("Promjene su spremljene. Primjenjuju se pri sljedećem zahtjevu korisnika."); toast({ message: "Promjene ureda su spremljene." }); router.refresh(); }
    } catch (err) { setError(err instanceof Error ? err.message : "Veza nije uspjela. Pokušajte ponovno."); }
    finally { setBusy(false); }
  }

  return <form onSubmit={save} className="admin-editor" aria-busy={busy}>
    <div className="admin-editor-main">
      <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">01 · Identitet</p><h2>Podaci o uredu</h2></div></div><div className="admin-form-grid"><label className="admin-field"><span>Naziv u sučelju</span><input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Odvjetnički ured Horvat" /><small>Prikazuje se uz LTB Law u radnom prostoru.</small></label><label className="admin-field"><span>Puni pravni naziv</span><input required maxLength={180} value={legalName} onChange={(event) => setLegalName(event.target.value)} placeholder="Puni naziv odvjetničkog ureda ili društva" /></label></div></section>
      <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">02 · Identitet radnog prostora</p><h2>Prepoznatljivo vašem uredu</h2></div></div><div className="admin-form-grid"><label className="admin-field"><span>Akcentna boja</span><select value={accent} onChange={(event) => setAccent(event.target.value)}>{!ACCENTS.some((option) => option.value.toLowerCase() === accent.toLowerCase()) && <option value={accent}>Prilagođena · {accent}</option>}{ACCENTS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><small>Suzdržan detalj uz stalni identitet LTB Law.</small></label><label className="admin-field"><span>Pozdrav na početnoj stranici</span><input maxLength={160} value={greeting} onChange={(event) => setGreeting(event.target.value)} placeholder="Vaš radni dan, na jednom mjestu." /></label></div></section>
      <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">03 · Funkcije</p><h2>Dostupni alati</h2></div><span className="admin-status">{features.length} od {FEATURE_CATALOG.length}</span></div><p className="admin-section-description">Uključene funkcije dostupne su svim ovlaštenim korisnicima ureda. Isključivanje čuva postojeće podatke.</p><div className="admin-preset-controls"><span>Početna postavka</span><button className="btn btn-sm" type="button" onClick={() => setFeatures([...FEATURE_PRESETS.core])}>Osnovni alati</button><button className="btn btn-sm" type="button" onClick={() => setFeatures([...FEATURE_PRESETS.complete])}>Sve funkcije</button></div><div className="admin-feature-grid">{FEATURE_CATALOG.map((feature) => <label className={`admin-feature ${features.includes(feature.key) ? "selected" : ""}`} key={feature.key}><input type="checkbox" checked={features.includes(feature.key)} onChange={() => toggleFeature(feature.key)} /><span><strong>{feature.label}</strong><small>{feature.description}</small>{feature.requires.length > 0 && <em>Potrebno: {feature.requires.map((key) => FEATURE_CATALOG.find((item) => item.key === key)?.label).join(", ")}</em>}</span></label>)}</div></section>
      {firm && <section className="admin-panel"><div className="admin-section-heading"><div><p className="eyebrow">04 · Pristup</p><h2>Status ureda</h2></div></div><label className="admin-field"><span>Dostupnost radnog prostora</span><select value={status} onChange={(event) => setStatus(event.target.value as FirmRecord["status"])}><option value="draft">U pripremi · korisnici nemaju pristup</option><option value="active">Aktivan · omogućen pristup</option><option value="suspended">Suspendiran · pristup obustavljen</option></select></label><p className="admin-section-description">Aktivirajte ured nakon dogovora i provjere identiteta, funkcija i korisnika. Suspenzija odmah onemogućuje sljedeće zahtjeve, uključujući postojeće sesije.</p></section>}
      {error && <div className="admin-notice error" role="alert">{error}</div>}
      {success && <div className="admin-notice success" role="status">{success}</div>}
      <div className="admin-save-bar"><div><strong>{firm ? "Spremite konfiguraciju" : "Najprije pripremite ured"}</strong><small>{firm ? "Promjene su zabilježene u administrativnom zapisniku." : "Ured će biti spremljen u pripremi. Zatim dodajte korisnike i aktivirajte pristup."}</small></div><button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Spremanje…" : firm ? "Spremi promjene" : "Kreiraj ured u pripremi"}</button></div>
    </div>
    <aside className="admin-preview"><p className="eyebrow">Pregled identiteta</p><div className="admin-preview-workspace" style={{ "--preview-accent": accent } as React.CSSProperties}><div className="admin-preview-brand">LTB <strong>Law</strong></div><div className="admin-preview-firm"><span>{(name || "Vaš ured").slice(0, 2).toLocaleUpperCase("hr-HR")}</span><strong>{name || "Naziv vašeg ureda"}</strong></div><div className="admin-preview-body"><small>RADNI PROSTOR UREDA</small><h3>{greeting || "Vaš radni dan, na jednom mjestu."}</h3><p>Dobro došli, Ana.</p><div className="admin-preview-module-list">{FEATURE_CATALOG.filter((feature) => features.includes(feature.key)).slice(0, 4).map((feature) => <div key={feature.key}>{feature.label}<span aria-hidden="true">→</span></div>)}</div></div></div><p className="admin-preview-caption">Prikaz koristi ogledni sadržaj. Identitet LTB Law ostaje zajednički svim uredima.</p><div className="admin-preview-summary"><span>Status nakon spremanja</span><strong>{STATUS[status]}</strong><span>Dostupne funkcije</span><strong>{features.length}</strong></div></aside>
  </form>;
}
