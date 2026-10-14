"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SOURCE_GROUPS, isSourceAvailable } from "@/lib/sources";
import { IArrowRight, IChevronDown, IDatabase } from "@/components/Icons";
import { useToast } from "@/components/Feedback";

/** Gumb „Izvori prava” s padajućim panelom prekidača —
 *  dostupan na Dokumentima, Provjeri ugovora i Pravnim pitanjima. */
export default function SourcesDropdown({
  sources,
  connected = [],
}: {
  sources: Record<string, boolean>;
  connected?: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(sources);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const onCount = Object.values(state).filter(Boolean).length;

  async function toggle(id: string) {
    const next = !state[id];
    setState((s) => ({ ...s, [id]: next }));
    setBusy(id);
    try {
      const response = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled: next }),
      });
      if (!response.ok) throw new Error();
      setError("");
      router.refresh();
    } catch {
      setError("Promjena nije spremljena. Pokušajte ponovno.");
      toast({ tone: "error", message: "Promjena izvora nije spremljena." });
      setState((s) => ({ ...s, [id]: !next }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="srcdd" ref={ref}>
      <button
        type="button"
        className="btn btn-secondary btn-md"
        aria-expanded={open}
        aria-controls="sources-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <IDatabase aria-hidden="true" />
        Izvori prava
        <span className="srcdd-count" aria-label={`${onCount} uključeno`}>{onCount}</span>
        <IChevronDown className={`srcdd-chev${open ? " up" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div id="sources-panel" className="srcdd-panel" role="dialog" aria-label="Izvori prava">
          {SOURCE_GROUPS.map((g) => (
            <div key={g.id} className="srcdd-group" role="group" aria-labelledby={`srcdd-${g.id}`}>
              <div id={`srcdd-${g.id}`} className="srcdd-title">{g.title}</div>
              {g.items.map((it) => {
                const available = isSourceAvailable(it.id, connected);
                return <div key={it.id} className="srcdd-row">
                  <span className="srcdd-name" id={`src-${it.id}`}>{it.name}{!available && <small>Nije povezano</small>}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={!!state[it.id]}
                    aria-labelledby={`src-${it.id}`}
                    className={`switch sw-sm${state[it.id] ? " on" : ""}`}
                    onClick={() => toggle(it.id)}
                    disabled={busy !== null || !available}
                    title={available ? undefined : "Izvor još nije povezan s vašim uredom."}
                  ><span className="knob" /></button>
                </div>;
              })}
            </div>
          ))}
          {error && <p role="alert" className="flash err">{error}</p>}
          <Link href="/izvori" className="srcdd-all">Svi izvori prava<IArrowRight size={14} aria-hidden="true" /></Link>
        </div>
      )}
    </div>
  );
}
