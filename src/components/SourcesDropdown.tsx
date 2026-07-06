"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SOURCE_GROUPS } from "@/lib/sources";
import { IDatabase } from "@/components/Icons";

/** Gumb „Izvori prava” s padajućim panelom prekidača —
 *  dostupan na Dokumentima, Provjeri ugovora i Pravnim pitanjima. */
export default function SourcesDropdown({
  sources,
}: {
  sources: Record<string, boolean>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState(sources);
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
      await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled: next }),
      });
      router.refresh();
    } catch {
      setState((s) => ({ ...s, [id]: !next }));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="srcdd" ref={ref}>
      <button
        type="button"
        className="btn btn-sm"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((o) => !o)}
      >
        <IDatabase size={15} />
        Izvori prava
        <span className="srcdd-count">{onCount}</span>
        <span className={`srcdd-chev${open ? " up" : ""}`}>▾</span>
      </button>

      {open && (
        <div className="srcdd-panel" role="menu">
          {SOURCE_GROUPS.map((g) => (
            <div key={g.id} className="srcdd-group">
              <div className="srcdd-title">{g.title}</div>
              {g.items.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  className="srcdd-row"
                  onClick={() => toggle(it.id)}
                  disabled={busy === it.id}
                >
                  <span className="srcdd-name">{it.name}</span>
                  <span
                    role="switch"
                    aria-checked={!!state[it.id]}
                    className={`switch sw-sm${state[it.id] ? " on" : ""}`}
                  >
                    <span className="knob" />
                  </span>
                </button>
              ))}
            </div>
          ))}
          <Link href="/izvori" className="srcdd-all">
            Puni pregled izvora →
          </Link>
        </div>
      )}
    </div>
  );
}
