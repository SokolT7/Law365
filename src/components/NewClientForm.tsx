"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/Button";
import { IPlus, IX } from "@/components/Icons";
import { useToast } from "@/components/Feedback";

/** "Novi klijent" button and dialog; also opens from ?novi=1 (used by the global "Novo" menu). */
export default function NewClientForm() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const toast = useToast();
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const open = () => { setError(""); if (!dialog.current?.open) dialog.current?.showModal(); };
  const close = () => {
    dialog.current?.close();
    if (params.get("novi")) router.replace(pathname, { scroll: false });
  };
  useEffect(() => { if (params.get("novi") === "1") open(); }, [params]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch("/api/clients", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(form.entries())) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Klijent nije spremljen.");
      dialog.current?.close();
      toast({ message: `Klijent „${form.get("name")}” je dodan.` });
      router.push(`/klijenti/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Klijent nije spremljen.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <Button variant="primary" icon={<IPlus />} onClick={open}>Novi klijent</Button>
    <dialog ref={dialog} className="dialog wide" aria-labelledby="new-client-title" onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === dialog.current) close(); }}>
      <div className="dialog-head">
        <div><h2 id="new-client-title" className="dialog-title">Novi klijent</h2><p>Dokumente i provjere kasnije možete povezati s klijentom.</p></div>
        <Button variant="ghost" size="sm" iconOnly icon={<IX />} onClick={close}>Zatvori</Button>
      </div>
      <form className="dialog-inner form-stack" onSubmit={submit}>
        <div className="grid grid-2">
          <label className="field">Naziv klijenta<input name="name" required maxLength={200} autoFocus placeholder="npr. Horvat d.o.o." /></label>
          <label className="field">Djelatnost<input name="sector" maxLength={200} placeholder="npr. Graditeljstvo" /></label>
          <label className="field">OIB <small>neobavezno · 11 znamenki</small><input name="oib" inputMode="numeric" pattern="[0-9]{11}" maxLength={11} title="OIB mora sadržavati 11 znamenki." /></label>
          <label className="field">Kontakt <small>neobavezno</small><input name="contact" maxLength={200} placeholder="e-adresa ili telefon" /></label>
        </div>
        {error && <p className="flash err" role="alert">{error}</p>}
        <div className="dialog-actions">
          <Button onClick={close}>Odustani</Button>
          <Button type="submit" variant="primary" loading={busy}>Dodaj klijenta</Button>
        </div>
      </form>
    </dialog>
  </>;
}
