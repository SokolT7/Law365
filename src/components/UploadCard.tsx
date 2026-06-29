"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IUpload } from "@/components/Icons";

type Mode = "sazetak" | "detaljna";
const STEPS = ["Čitanje datoteke", "Indeksiranje teksta", "Slanje na obradu (n8n + Claude)"];

export default function UploadCard() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<Mode>("sazetak");
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 500);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", mode);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const data = await res.json();
      clearInterval(timer);
      if (!res.ok) {
        setError(data?.error || "Učitavanje nije uspjelo.");
        setBusy(false);
        return;
      }
      router.push(`/dokumenti/${data.id}?prikaz=${data.mode}`);
    } catch {
      clearInterval(timer);
      setError("Došlo je do pogreške pri učitavanju.");
      setBusy(false);
    }
  }

  return (
    <div className="card card-pad">
      {error && <div className="flash err">{error}</div>}

      {!busy && (
        <>
          <div className="seg-label">Vrsta obrade</div>
          <div className="segmented">
            <button
              className={`seg${mode === "sazetak" ? " active" : ""}`}
              onClick={() => setMode("sazetak")}
            >
              Sažetak
            </button>
            <button
              className={`seg${mode === "detaljna" ? " active" : ""}`}
              onClick={() => setMode("detaljna")}
            >
              Detaljna analiza
            </button>
          </div>
        </>
      )}

      {!busy ? (
        <div
          className={`drop${over ? " over" : ""}`}
          style={{ marginTop: 12, cursor: "pointer" }}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
        >
          <IUpload size={26} color="var(--gold)" />
          <p>Učitajte dokument</p>
          <small>Povucite datoteku ovdje ili kliknite · .pdf, .docx, .txt</small>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      ) : (
        <div className="drop" style={{ cursor: "default" }}>
          <p>Slanje na obradu…</p>
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
