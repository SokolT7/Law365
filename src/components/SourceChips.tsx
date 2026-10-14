"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SourceChips({ enabled, editable = false }: { enabled: Record<string, boolean>; editable?: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(!!enabled["vasi-dokumenti"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function toggle() {
    if (!editable || busy) return;
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/sources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: "vasi-dokumenti", enabled: !on }) });
      if (!response.ok) throw new Error();
      setOn(!on); router.refresh();
    } catch { setError("Promjena izvora nije spremljena."); }
    finally { setBusy(false); }
  }
  return <div className="source-chips"><span className="sc-lab">Izvori</span>
    {editable ? <button type="button" className={`source-chip${on ? " on" : ""}`} aria-pressed={on} onClick={toggle} disabled={busy}><span className="sc-dot" />Vaši dokumenti</button> : <span className={`source-chip${on ? " on" : ""}`}><span className="sc-dot" />{on ? "Vaši dokumenti" : "Izvori nisu uključeni"}</span>}
    {error && <span role="alert" className="t-sub">{error}</span>}
  </div>;
}
