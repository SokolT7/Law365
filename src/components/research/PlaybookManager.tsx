"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { Playbook } from "@/lib/research/playbooks";
import { Button } from "@/components/Button";
import { useConfirm, useToast } from "@/components/Feedback";
import { IChat, IPlus, IX } from "@/components/Icons";

export default function PlaybookManager({ initial, canManage }: { initial: Playbook[]; canManage: boolean }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [playbooks, setPlaybooks] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/playbooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        name: form.get("name"), description: form.get("description"), instructions: form.get("instructions"),
        starters: String(form.get("starters") || "").split("\n").map((s) => s.trim()).filter(Boolean),
      }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Asistent nije spremljen.");
      setPlaybooks((all) => [...all, data.playbook]);
      dialog.current?.close();
      (event.target as HTMLFormElement).reset();
      toast({ message: `Asistent „${data.playbook.name}” je dodan.` });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Asistent nije spremljen.");
    } finally { setBusy(false); }
  }

  async function remove(playbook: Playbook) {
    if (!(await confirm({ title: `Ukloniti asistenta „${playbook.name}”?`, body: "Postojeći odgovori ostaju sačuvani; asistent se više neće nuditi u istraživanju.", confirmLabel: "Ukloni asistenta", destructive: true }))) return;
    const response = await fetch(`/api/playbooks?id=${encodeURIComponent(playbook.id)}`, { method: "DELETE" });
    if (!response.ok) { toast({ tone: "error", message: "Uklanjanje nije uspjelo." }); return; }
    setPlaybooks((all) => all.filter((p) => p.id !== playbook.id));
    toast({ message: "Asistent je uklonjen." });
  }

  const groups = [["Asistenti ureda", playbooks.filter((p) => !p.builtIn)], ["Asistenti LTB Law", playbooks.filter((p) => p.builtIn)]] as const;
  return <>
    {canManage && <div className="toolbar-row"><p className="t-sub">Asistenti usmjeravaju istraživanje: dodaju upute, preferirane propise i predloške pitanja. Vide ih svi članovi ureda.</p><Button variant="primary" icon={<IPlus />} onClick={() => { setError(""); dialog.current?.showModal(); }}>Novi asistent</Button></div>}
    {groups.map(([title, list]) => <section key={title} className="playbook-section">
      <h2 className="upload-heading">{title}</h2>
      {list.length ? <div className="playbook-grid">{list.map((p) => <article key={p.id} className="card card-pad playbook-card">
        <div className="playbook-top"><span className="playbook-icon" aria-hidden="true"><IChat /></span><div><h3>{p.name}</h3>{p.description && <p className="t-sub">{p.description}</p>}</div>
          {canManage && !p.builtIn && <Button variant="ghost" size="sm" iconOnly icon={<IX />} onClick={() => remove(p)}>{`Ukloni ${p.name}`}</Button>}</div>
        <p className="playbook-instructions">{p.instructions}</p>
        {p.preferActs?.length ? <div className="badges">{p.preferActs.map((a) => <span key={a} className="badge info">{a}</span>)}</div> : null}
        <div className="playbook-foot"><span className="t-sub">{p.builtIn ? "LTB Law" : `Dodao: ${p.createdBy ?? "ured"}`}{p.starters?.length ? ` · ${p.starters.length} predložaka pitanja` : ""}</span><Link className="link" href={`/pitanja?asistent=${encodeURIComponent(p.id)}`}>Koristi u istraživanju</Link></div>
      </article>)}</div> : <p className="t-sub">{canManage ? "Dodajte prvog asistenta ureda, npr. za vaše standardne klauzule ili praksu u određenom području." : "Ured još nema vlastitih asistenata."}</p>}
    </section>)}

    {canManage && <dialog ref={dialog} className="dialog wide" aria-labelledby="pb-title" onClick={(e) => { if (e.target === dialog.current) dialog.current?.close(); }}>
      <div className="dialog-head"><div><h2 id="pb-title" className="dialog-title">Novi asistent ureda</h2><p>Upute se dodaju svakom pitanju postavljenom s ovim asistentom.</p></div><Button variant="ghost" size="sm" iconOnly icon={<IX />} onClick={() => dialog.current?.close()}>Zatvori</Button></div>
      <form className="dialog-inner form-stack" onSubmit={create}>
        <label className="field">Naziv<input name="name" required maxLength={80} placeholder="npr. Zakup poslovnih prostora" /></label>
        <label className="field">Kratki opis <small>neobavezno</small><input name="description" maxLength={240} placeholder="Za koga i za što je asistent" /></label>
        <label className="field">Upute <small>najmanje 20 znakova</small><textarea name="instructions" required minLength={20} maxLength={4000} rows={5} placeholder="npr. Uvijek provjeri otkazne rokove i solemnizaciju; rizike navedi iz perspektive zakupnika." /></label>
        <label className="field">Predlošci pitanja <small>jedan po retku, neobavezno</small><textarea name="starters" rows={3} maxLength={2400} /></label>
        {error && <p className="flash err" role="alert">{error}</p>}
        <div className="dialog-actions"><Button onClick={() => dialog.current?.close()}>Odustani</Button><Button type="submit" variant="primary" loading={busy}>Dodaj asistenta</Button></div>
      </form>
    </dialog>}
  </>;
}
