"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { AiNote } from "@/components/ui";
import { useToast } from "@/components/Feedback";
import useDraftGuard from "@/components/useDraftGuard";
import { IArrowDown, IReset, ISpark, IStop } from "@/components/Icons";
import { DRAFT_KINDS, type DraftKindId } from "@/lib/drafting/kinds";
import type { DraftEvent, DraftSource } from "@/lib/drafting/engine";

type Client = { id: string; name: string };

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Word opens HTML saved as .doc, keeping headings and paragraphs without a docx library. */
function downloadForWord(title: string, text: string) {
  const body = text.split(/\n{2,}/).map((block, i) => {
    const html = escapeHtml(block).replace(/\n/g, "<br>");
    if (i === 0) return `<h1 style="text-align:center;font-size:14pt">${html}</h1>`;
    if (/^Članak \d+\.?$/.test(block.trim())) return `<p style="text-align:center;font-weight:bold">${html}</p>`;
    return `<p style="text-align:justify">${html}</p>`;
  }).join("\n");
  const doc = `<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="font-family:'Times New Roman';font-size:12pt">${body}</body></html>`;
  const url = URL.createObjectURL(new Blob(["﻿", doc], { type: "application/msword" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `${title.replace(/[\\/:*?"<>|]+/g, " ").trim() || "Nacrt"}.doc` });
  a.click();
  URL.revokeObjectURL(url);
}

/** Pick a document, describe it, get a draft to edit, refine and save. */
export default function DraftStudio({ clients, aiEnabled, initialClientId = "" }: { clients: Client[]; aiEnabled: boolean; initialClientId?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [kindId, setKindId] = useState<DraftKindId>("ugovor-o-djelu");
  const [brief, setBrief] = useState("");
  const [clientId, setClientId] = useState(initialClientId);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [sources, setSources] = useState<DraftSource[]>([]);
  const [instruction, setInstruction] = useState("");
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const controller = useRef<AbortController | null>(null);
  const kind = DRAFT_KINDS.find((k) => k.id === kindId)!;
  const blanks = text.match(/\[[^\]\n]{1,80}\]/g)?.length ?? 0;
  useDraftGuard(Boolean(text) && !saving);

  async function stream(body: Record<string, unknown>, previous: string) {
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setRunning(true); setError(""); setText("");
    let failure = "", received = "";
    try {
      const response = await fetch("/api/drafts/stream", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ac.signal });
      if (!response.ok || !response.body) throw new Error((await response.json().catch(() => null))?.error || "Nacrt trenutačno nije dostupan.");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const data = frame.split("\n").filter((l) => l.startsWith("data: ")).map((l) => l.slice(6)).join("\n");
          if (!data) continue;
          const event = JSON.parse(data) as DraftEvent;
          if (event.type === "sources") setSources(event.sources);
          else if (event.type === "delta") { received += event.text; setText(received); }
          else if (event.type === "complete") { received = event.text; setText(received); }
          else if (event.type === "error") failure = event.message;
        }
      }
    } catch (err) {
      if (!ac.signal.aborted) failure = err instanceof Error ? err.message : "Nacrt trenutačno nije dostupan.";
    }
    // Keep the previous version when a revision fails or is stopped before any text arrived.
    if (!received.trim()) setText(previous);
    if (failure) setError(failure);
    setRunning(false);
  }

  function compose(event: React.FormEvent) {
    event.preventDefault();
    if (!brief.trim()) { setError("Opišite ukratko što dokument treba sadržavati."); return; }
    setTitle(kind.label);
    setInstruction("");
    void stream({ kind: kindId, brief, clientId }, "");
  }

  function revise(event: React.FormEvent) {
    event.preventDefault();
    if (!instruction.trim()) return;
    const previous = text;
    void stream({ kind: kindId, brief, clientId, current: previous, instruction }, previous).then(() => setInstruction(""));
  }

  async function save() {
    setSaving(true); setError("");
    try {
      const res = await fetch("/api/drafts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: kindId, title, text, clientId }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Dokument nije spremljen.");
      toast({ message: `„${title}” je spremljen u dokumente.` });
      router.push(`/dokumenti/${data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dokument nije spremljen.");
      setSaving(false);
    }
  }

  function restart() {
    if (text && !window.confirm("Odbaciti ovaj nacrt?")) return;
    controller.current?.abort();
    setText(""); setSources([]); setError(""); setInstruction("");
  }

  if (!text && !running) return (
    <form className="card card-pad draft-form form-stack" onSubmit={compose}>
      <fieldset className="draft-kinds">
        <legend className="field-label">Što sastavljamo?</legend>
        {DRAFT_KINDS.map((k) => <label key={k.id} className={`draft-kind${k.id === kindId ? " on" : ""}`}>
          <input type="radio" name="kind" value={k.id} checked={k.id === kindId} onChange={() => setKindId(k.id)} />{k.label}
        </label>)}
      </fieldset>
      <label className="field">Opišite što treba
        <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={5} maxLength={6000} placeholder={kind.hint} />
      </label>
      {clients.length > 0 && <label className="field">Klijent
        <select value={clientId} onChange={(e) => setClientId(e.target.value)}>
          <option value="">Bez klijenta</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>}
      {error && <p className="flash err" role="alert">{error}</p>}
      <Button type="submit" variant="primary" size="lg" icon={<ISpark />}>Sastavi</Button>
      {!aiEnabled && <p className="field-help">AI nije uključen: dobit ćete predložak s praznim poljima za popunjavanje.</p>}
    </form>
  );

  return (
    <div className="draft-studio">
      <label className="field draft-title"><span className="sr-only">Naziv dokumenta</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} disabled={running} />
      </label>
      <textarea className={`draft-paper${running ? " streaming" : ""}`} value={text} onChange={(e) => setText(e.target.value)} readOnly={running} aria-label="Tekst nacrta" spellCheck />
      {error && <p className="flash err" role="alert">{error}</p>}
      {running ? (
        <div className="draft-actions"><Button icon={<IStop />} onClick={() => controller.current?.abort()}>Zaustavi</Button><span className="t-sub">Sastavljam…</span></div>
      ) : <>
        {aiEnabled && <form className="draft-revise" onSubmit={revise}>
          <label className="field"><span className="sr-only">Što promijeniti?</span>
            <input value={instruction} onChange={(e) => setInstruction(e.target.value)} maxLength={2000} placeholder="Što promijeniti? npr. dodaj ugovornu kaznu od 10 % za kašnjenje" />
          </label>
          <Button type="submit" icon={<ISpark />} disabled={!instruction.trim()}>Doradi</Button>
        </form>}
        <div className="draft-actions">
          <Button variant="primary" loading={saving} onClick={save} disabled={!title.trim()}>Spremi u dokumente</Button>
          <Button icon={<IArrowDown />} onClick={() => downloadForWord(title, text)}>Preuzmi za Word</Button>
          <Button variant="ghost" icon={<IReset />} onClick={restart}>Počni ispočetka</Button>
        </div>
        <div className="draft-foot">
          <AiNote label={blanks ? `AI nacrt · popunite ${blanks} ${blanks === 1 ? "polje" : "polja"} u [zagradama] i provjerite prije uporabe` : "AI nacrt · provjerite prije uporabe"} />
          {sources.length > 0 && <details className="draft-sources"><summary>Pravna osnova ({sources.length})</summary>
            <ul>{sources.map((s) => <li key={s.label}>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.label}</a> : s.label} — {s.title}{s.heading ? `, ${s.heading}` : ""}</li>)}</ul>
          </details>}
        </div>
      </>}
    </div>
  );
}
