"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SourceToggle({
  id,
  enabled,
}: {
  id: string;
  enabled: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !on;
    setOn(next);
    setBusy(true);
    try {
      await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled: next }),
      });
      router.refresh();
    } catch {
      setOn(!next); // vrati natrag pri grešci
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      role="switch"
      aria-checked={on}
      className={`switch${on ? " on" : ""}`}
      onClick={toggle}
      disabled={busy}
    >
      <span className="knob" />
    </button>
  );
}
