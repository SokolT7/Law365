"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IChevronDown, ISearch, IUsers, IX } from "@/components/Icons";
import { useToast } from "@/components/Feedback";
import { fold } from "@/components/shell/CommandPalette";

/** Workspace-wide client scope: documents, research, review and the dashboard follow it. */
export default function ClientScope({ clients, active }: { clients: { id: string; name: string }[]; active: { id: string; name: string } | null }) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    wrap.current?.querySelector<HTMLInputElement>("input")?.focus();
    const onDown = (e: MouseEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); wrap.current?.querySelector<HTMLButtonElement>(".scope-button")?.focus(); } };
    document.addEventListener("mousedown", onDown); document.addEventListener("keydown", onKey, true);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey, true); };
  }, [open]);
  const shown = useMemo(() => clients.filter((c) => !query || fold(c.name).includes(fold(query))), [clients, query]);

  async function choose(clientId: string | null, name?: string) {
    setBusy(true); setOpen(false); setQuery("");
    try {
      const response = await fetch("/api/scope", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId }) });
      if (!response.ok) throw new Error();
      toast({ tone: "info", message: clientId ? `Prikaz za klijenta: ${name}` : "Prikazani su svi klijenti." });
      router.refresh();
    } catch {
      toast({ tone: "error", message: "Opseg nije promijenjen." });
    } finally { setBusy(false); }
  }

  if (!clients.length) return null;
  return <div className={`client-scope${active ? " active" : ""}`} ref={wrap}>
    <button type="button" className="scope-button" aria-haspopup="listbox" aria-expanded={open} disabled={busy} onClick={() => setOpen((v) => !v)} title={active ? `Klijent: ${active.name}` : "Svi klijenti"}>
      <IUsers aria-hidden="true" />
      <span className="scope-text"><span>Klijent</span><b>{active ? active.name : "Svi klijenti"}</b></span>
      {busy ? <span className="btn-spinner" aria-hidden="true" /> : <IChevronDown className="scope-chev" aria-hidden="true" />}
    </button>
    {active && <button type="button" className="scope-clear" aria-label="Prikaži sve klijente" title="Prikaži sve klijente" onClick={() => choose(null)}><IX size={14} /></button>}
    {open && <div className="menu down scope-menu">
      {clients.length > 6 && <label className="search-field"><ISearch aria-hidden="true" /><span className="sr-only">Pretraži klijente</span><input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Pretraži klijente…" /></label>}
      <div role="listbox" aria-label="Klijent">
        <button type="button" role="option" aria-selected={!active} className="menu-item" onClick={() => choose(null)}>Svi klijenti</button>
        {shown.map((c) => <button key={c.id} type="button" role="option" aria-selected={active?.id === c.id} className="menu-item" onClick={() => choose(c.id, c.name)}>{c.name}</button>)}
        {!shown.length && <p className="t-sub scope-empty">Nema klijenata za „{query}”.</p>}
      </div>
    </div>}
  </div>;
}
