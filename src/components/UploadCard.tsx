"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IUpload } from "@/components/Icons";


export type UploadKind = "dokument" | "ugovor";

export default function UploadCard({
  clients = [],
  fixedClientId,
  kind = "choice",
  redirect = "workspace",
  heading,
}: {
  clients?: { id: string; name: string }[];
  /** unaprijed odabran klijent (npr. na stranici klijenta) */
  fixedClientId?: string;
  /** "choice" = korisnik bira Dokument/Ugovor; "ugovor" = zaključano na ugovor */
  kind?: "choice" | "ugovor";
  /** kamo nakon učitavanja: radni prostor ili ravno u provjeru */
  redirect?: "workspace" | "provjera";
  heading?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientId, setClientId] = useState(fixedClientId ?? "");
  const [docKind, setDocKind] = useState<UploadKind>(kind === "ugovor" ? "ugovor" : "dokument");

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (list.length === 0 || busy) return;
    if (list.length > 10 || list.some(f=>f.size>10*1024*1024) || list.reduce((n,f)=>n+f.size,0)>25*1024*1024) {setError("Najviše 10 datoteka, 10 MB po datoteci i 25 MB ukupno.");return;}
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData();
      list.forEach((f) => fd.append("file", f));
      const cid = fixedClientId ?? clientId;
      if (cid) fd.append("clientId", cid);
      fd.append("kind", docKind);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Učitavanje nije uspjelo.");
        setBusy(false);
        return;
      }
      router.push(redirect === "provjera" ? `/provjera?dok=${data.id}` : `/dokumenti/${data.id}`);
      router.refresh();
    } catch {
      setError("Došlo je do pogreške pri učitavanju.");
      setBusy(false);
    }
  }

  return (
    <div className="card card-pad">
      {heading && (
        <div className="seg-label" style={{ marginBottom: 10 }}>{heading}</div>
      )}
      {error && <div role="alert" className="flash err">{error}</div>}

      {!busy && kind === "choice" && (
        <div style={{ marginBottom: 12 }}>
          <div className="seg-label">Vrsta</div>
          <div className="segmented">
            {(["dokument", "ugovor"] as UploadKind[]).map((k) => (
              <button
                key={k}
                type="button"
                className={`seg${docKind === k ? " active" : ""}`}
                onClick={() => setDocKind(k)}
              >
                {k === "dokument" ? "Dokument" : "Ugovor"}
              </button>
            ))}
          </div>
        </div>
      )}

      {!busy && !fixedClientId && clients.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div className="seg-label">Klijent</div>
          <select
            aria-label="Klijent za dokument"
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
          role="button"
          tabIndex={0}
          aria-label="Odaberite datoteke za učitavanje"
          onKeyDown={(e)=>{if(e.key === "Enter" || e.key === " "){e.preventDefault(); inputRef.current?.click();}}}
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
          <p>{kind === "ugovor" || docKind === "ugovor" ? "Učitajte ugovor(e)" : "Učitajte dokument(e)"}</p>
          <small>PDF, DOCX, TXT ili MD · do 10 MB po datoteci</small>
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
          <p>{redirect === "provjera" ? "Priprema provjere…" : "Priprema radnog prostora…"}</p>
          <div className="spinner" aria-hidden="true" />
          <p className="muted" role="status">Datoteke se učitavaju i pripremaju za rad.</p>
        </div>
      )}
    </div>
  );
}
