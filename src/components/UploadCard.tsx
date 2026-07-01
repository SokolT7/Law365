"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IUpload } from "@/components/Icons";

const STEPS = ["Čitanje datoteka", "Indeksiranje teksta", "Priprema radnog prostora"];

export default function UploadCard({
  clients = [],
}: {
  clients?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState("");

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0) return;
    setError(null);
    setBusy(true);
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 450);
    try {
      const fd = new FormData();
      list.forEach((f) => fd.append("file", f));
      if (clientId) fd.append("clientId", clientId);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const data = await res.json();
      clearInterval(timer);
      if (!res.ok) {
        setError(data?.error || "Učitavanje nije uspjelo.");
        setBusy(false);
        return;
      }
      router.push(`/dokumenti/${data.id}`);
    } catch {
      clearInterval(timer);
      setError("Došlo je do pogreške pri učitavanju.");
      setBusy(false);
    }
  }

  return (
    <div className="card card-pad">
      {error && <div className="flash err">{error}</div>}
      {clients.length > 0 && !busy && (
        <div style={{ marginBottom: 12 }}>
          <div className="seg-label">Klijent</div>
          <select
            className="select"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">Bez klijenta (interno)</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      )}
      {!busy ? (
        <div
          className={`drop${over ? " over" : ""}`}
          style={{ cursor: "pointer" }}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
        >
          <IUpload size={26} color="var(--gold)" />
          <p>Učitajte dokument(e)</p>
          <small>Povucite jednu ili više datoteka · .pdf, .docx, .txt</small>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt,.md"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files?.length) handleFiles(e.target.files);
            }}
          />
        </div>
      ) : (
        <div className="drop" style={{ cursor: "default" }}>
          <p>Priprema radnog prostora…</p>
          <div className="progress">
            <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
          </div>
          <div className="steps">
            {STEPS.map((s, i) => (
              <div key={s} className={i <= step ? "done" : ""}>
                {i < step ? "✓ " : i === step ? "• " : "  "}
                {s}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
