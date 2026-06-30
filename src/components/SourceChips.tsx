"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const COMPOSER_SOURCES: { id: string; label: string }[] = [
  { id: "vasi-dokumenti", label: "Vaši dokumenti" },
  { id: "rh-praksa", label: "Sudska praksa" },
  { id: "eu-propisi", label: "EU propisi" },
  { id: "web", label: "Web" },
];

export default function SourceChips({ enabled }: { enabled: Record<string, boolean> }) {
  const router = useRouter();
  const [state, setState] = useState(enabled);
  const [busy, setBusy] = useState<string | null>(null);

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
    <div className="source-chips">
      <span className="sc-lab">Izvori</span>
      {COMPOSER_SOURCES.map((s) => {
        const on = !!state[s.id];
        return (
          <button
            key={s.id}
            type="button"
            className={`source-chip${on ? " on" : ""}`}
            onClick={() => toggle(s.id)}
            disabled={busy === s.id}
          >
            <span className="sc-dot" />
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
