"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SourceToggle({
  id,
  enabled,
  disabled = false,
}: {
  id: string;
  enabled: boolean;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !on;
    setOn(next);
    setBusy(true);
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
      setError("Promjena nije spremljena.");
      setOn(!next); // vrati natrag pri grešci
    } finally {
      setBusy(false);
    }
  }

  return (
    <><button
      aria-label="Promijeni dostupnost izvora"
      role="switch"
      aria-checked={on}
      className={`switch${on ? " on" : ""}`}
      onClick={toggle}
      disabled={busy || disabled}
    >
      <span className="knob" />
    </button>{error && <span role="alert" className="t-sub">{error}</span>}</>
  );
}
