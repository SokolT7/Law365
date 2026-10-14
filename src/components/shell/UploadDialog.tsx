"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { useToast } from "@/components/Feedback";
import { IFile, IUpload, IX } from "@/components/Icons";
import type { UploadOptions } from "@/components/shell/WorkspaceContext";

const MAX_FILE = 10 * 1024 * 1024, MAX_TOTAL = 25 * 1024 * 1024, MAX_COUNT = 10;
const SUPPORTED = /\.(pdf|docx|txt|md)$/i;

type Entry = { file: File; error?: string };

export function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toLocaleString("hr-HR", { maximumFractionDigits: 1 })} MB`;
}

export function plural(n: number, one: string, few: string, many: string) {
  const rule = new Intl.PluralRules("hr-HR").select(n);
  return `${n} ${rule === "one" ? one : rule === "few" ? few : many}`;
}

function validate(file: File): string | undefined {
  if (!SUPPORTED.test(file.name)) return "Nepodržan format — koristite PDF, DOCX, TXT ili MD.";
  if (file.size > MAX_FILE) return `Datoteka je veća od 10 MB (${formatSize(file.size)}).`;
  return undefined;
}

export default function UploadDialog({ open, options, onClose, clients, features }: {
  open: boolean;
  options: UploadOptions;
  onClose: () => void;
  clients: { id: string; name: string }[];
  features?: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [over, setOver] = useState(false);
  const [clientId, setClientId] = useState("");
  const [contract, setContract] = useState(false);
  const [kindTouched, setKindTouched] = useState(false);
  const [summarize, setSummarize] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");
  const request = useRef<XMLHttpRequest | null>(null);
  const background = useRef(false);
  const has = (key: string) => !features || features.includes(key);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) {
      origin.current = document.activeElement as HTMLElement;
      background.current = false;
      setEntries((options.files ?? []).map((file) => ({ file, error: validate(file) })));
      setClientId(options.clientId ?? "");
      setContract(!!options.contract);
      setKindTouched(!!options.contract);
      setError("");
      el.showModal();
    }
    if (!open && el.open) { el.close(); origin.current?.focus(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function add(files: FileList | File[]) {
    setError("");
    const incoming = Array.from(files).map((file) => ({ file, error: validate(file) }));
    setEntries((current) => {
      const names = new Set(current.map((entry) => `${entry.file.name}:${entry.file.size}`));
      return [...current, ...incoming.filter((entry) => !names.has(`${entry.file.name}:${entry.file.size}`))].slice(0, MAX_COUNT);
    });
    // Suggest "Ugovor" when a filename says so, unless the user already chose.
    if (!kindTouched && incoming.some((entry) => /ugovor|contract|aneks/i.test(entry.file.name))) setContract(true);
  }

  const valid = entries.filter((entry) => !entry.error);
  const total = valid.reduce((sum, entry) => sum + entry.file.size, 0);
  const tooLarge = total > MAX_TOTAL;
  const busy = progress !== null;

  function close() {
    if (busy) {
      // Keep the upload running; report the result as a toast.
      background.current = true;
      onClose();
      toast({ tone: "info", message: "Učitavanje se nastavlja u pozadini." });
      return;
    }
    setEntries([]);
    onClose();
  }

  function upload() {
    if (!valid.length || tooLarge || busy) return;
    const data = new FormData();
    valid.forEach((entry) => data.append("file", entry.file));
    if (clientId) data.append("clientId", clientId);
    data.append("kind", contract ? "ugovor" : "dokument");
    setError(""); setProgress(0);
    const xhr = new XMLHttpRequest();
    request.current = xhr;
    xhr.open("POST", "/api/documents");
    xhr.upload.onprogress = (event) => { if (event.lengthComputable) setProgress(Math.round((event.loaded / event.total) * 90)); };
    xhr.onerror = () => { setProgress(null); setError("Veza je prekinuta. Provjerite mrežu i pokušajte ponovno."); if (background.current) toast({ tone: "error", message: "Učitavanje nije uspjelo." }); };
    xhr.onload = async () => {
      let body: { id?: string; error?: string } = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* handled below */ }
      if (xhr.status >= 300 || !body.id) {
        setProgress(null);
        const message = body.error || "Učitavanje nije uspjelo. Pokušajte ponovno.";
        setError(message);
        if (background.current) toast({ tone: "error", message });
        return;
      }
      setProgress(100);
      let mode = "";
      if (summarize && !contract) {
        const started = await fetch(`/api/documents/${body.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "sazetak" }) }).catch(() => null);
        if (started?.ok) mode = "?analiza=sazetak";
      }
      const href = contract && has("contract_review") ? `/provjera?dok=${body.id}` : `/dokumenti/${body.id}${mode}`;
      const label = valid.length === 1 ? "Dokument je učitan." : `${plural(valid.length, "datoteka je učitana", "datoteke su učitane", "datoteka je učitano")} u jedan radni prostor.`;
      setEntries([]); setProgress(null);
      if (background.current) {
        toast({ message: label, action: { label: "Otvori", onClick: () => router.push(href) } });
        router.refresh();
      } else {
        onClose();
        toast({ message: label });
        router.push(href);
        router.refresh();
      }
    };
    xhr.send(data);
  }

  const kindLabel = contract ? "ugovor" : "dokument";
  return <dialog ref={dialog} className="dialog wide upload-dialog" aria-labelledby="upload-title" onCancel={(event) => { event.preventDefault(); close(); }} onClick={(event) => { if (event.target === dialog.current) close(); }}>
    <div className="dialog-head">
      <div><h2 id="upload-title" className="dialog-title">{options.contract ? "Nova provjera ugovora" : "Učitaj dokument"}</h2><p>Više datoteka čini jedan radni prostor dokumenta.</p></div>
      <Button variant="ghost" size="sm" iconOnly icon={<IX />} onClick={close}>Zatvori</Button>
    </div>
    <div className="dialog-inner">
      {!busy && <button type="button" className={`drop${over ? " over" : ""}`}
        onClick={() => input.current?.click()}
        onDragOver={(event) => { event.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => { event.preventDefault(); setOver(false); if (event.dataTransfer.files?.length) add(event.dataTransfer.files); }}>
        <span className="drop-icon"><IUpload size={20} aria-hidden="true" /></span>
        <p>Ispustite datoteke ovdje ili <b>odaberite s računala</b></p>
        <small>PDF, DOCX, TXT ili MD · do 10 MB po datoteci · najviše 10 datoteka</small>
      </button>}
      <input ref={input} type="file" multiple accept=".pdf,.docx,.txt,.md" hidden onChange={(event) => { if (event.target.files?.length) add(event.target.files); event.target.value = ""; }} />

      {entries.length > 0 && <ul className="file-list" aria-label="Odabrane datoteke">
        {entries.map((entry, i) => <li key={`${entry.file.name}-${i}`} className={`file-row${entry.error ? " invalid" : ""}`}>
          <IFile aria-hidden="true" />
          <span className="file-main"><span className="file-name">{entry.file.name}</span><span className="file-meta">{entry.error ?? formatSize(entry.file.size)}</span></span>
          {!busy && <Button variant="ghost" size="sm" iconOnly icon={<IX />} onClick={() => setEntries((all) => all.filter((_, index) => index !== i))}>{`Ukloni ${entry.file.name}`}</Button>}
        </li>)}
      </ul>}
      {tooLarge && <p className="flash err" role="alert">Ukupna veličina je {formatSize(total)}; najviše je 25 MB.</p>}

      {!busy && <div className="upload-fields">
        {has("clients") && clients.length > 0 && <label className="field">Klijent
          <select value={clientId} onChange={(event) => setClientId(event.target.value)}>
            <option value="">Bez klijenta (interno)</option>
            {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
          </select>
        </label>}
        {!options.contract && <div className="field"><span id="upload-kind">Vrsta</span>
          <div className="segmented" role="radiogroup" aria-labelledby="upload-kind">
            {[false, true].map((value) => <button key={String(value)} type="button" role="radio" aria-checked={contract === value} className={`seg${contract === value ? " active" : ""}`} onClick={() => { setContract(value); setKindTouched(true); }}>{value ? "Ugovor" : "Dokument"}</button>)}
          </div>
        </div>}
      </div>}
      {!busy && !contract && has("summary_analysis") && <label className="check-row">
        <input type="checkbox" checked={summarize} onChange={(event) => setSummarize(event.target.checked)} /> Odmah pokreni sažetak
      </label>}

      {busy && <div className="upload-progress" role="status">
        <div className="t-sub"><span>{progress! < 90 ? "Učitavanje…" : "Priprema radnog prostora…"}</span><span className="mono">{progress}%</span></div>
        <div className={`progress${progress! >= 90 ? " indeterminate" : ""}`}><span style={{ width: progress! >= 90 ? undefined : `${progress}%` }} /></div>
      </div>}
      {error && <p className="flash err section-gap" role="alert">{error}</p>}

      <div className="dialog-actions">
        <span className="t-sub">{valid.length > 0 && !busy ? `${plural(valid.length, "datoteka", "datoteke", "datoteka")} · ${formatSize(total)}` : ""}</span>
        <Button onClick={close}>{busy ? "Nastavi u pozadini" : "Odustani"}</Button>
        <Button variant="primary" icon={<IUpload />} loading={busy} disabled={!valid.length || tooLarge} onClick={upload}>
          {contract && has("contract_review") ? "Učitaj i provjeri" : valid.length > 1 ? `Učitaj ${plural(valid.length, "datoteku", "datoteke", "datoteka")}` : `Učitaj ${kindLabel}`}
        </Button>
      </div>
    </div>
  </dialog>;
}
