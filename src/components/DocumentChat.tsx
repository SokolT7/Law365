"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Composer, { type ComposerHandle } from "@/components/Composer";
import type { ChatMessage } from "@/lib/types";
import { IPaperclip, IImage, IArrowDown, IChat, IX } from "@/components/Icons";
import { useToast } from "@/components/Feedback";
import { EvidenceButton } from "./EvidenceWorkspace";
import useDraftGuard from "./useDraftGuard";
import SourceChips from "@/components/SourceChips";
import { AnswerActions, CalculationCard, RichAnswer, SearchTrace, SourceSummary, VerificationNote } from "@/components/research/Answer";
import { useAnswerStream } from "@/components/research/useAnswerStream";

const SUGGESTIONS = ["O čemu je ovaj dokument?", "Koje su glavne obveze i rokovi?", "Na što da posebno pripazim?"];

const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random()));

function Assistant({ message }: { message: ChatMessage }) {
  // New answers carry typed sources; older saved answers fall back to plain text with legacy citation chips.
  if (message.sources) {
    return <div className="bubble ai answer">
      {message.steps?.length ? <SearchTrace steps={message.steps} sources={message.sources} running={false} /> : null}
      {message.calculation && <CalculationCard calc={message.calculation} />}
      <RichAnswer text={message.text} sources={message.sources} />
      {message.stopped && <p className="t-sub">Odgovor je zaustavljen prije završetka.</p>}
      {message.sources.length > 0 && <div className="answer-foot"><VerificationNote verification={message.verification} /><SourceSummary sources={message.sources} /><AnswerActions text={message.text} /></div>}
    </div>;
  }
  return <div className="bubble ai">
    <div className="msg-text">{message.text}</div>
    {message.citations?.length ? <div className="cites" aria-label="Izvori odgovora">{message.citations.map((c, i) => <EvidenceButton key={i} citation={c} index={i + 1} />)}</div> : null}
  </div>;
}

export default function DocumentChat({ documentId, initialMessages, sources, canManageSources = false }: {
  documentId: string;
  initialMessages: ChatMessage[];
  sources: Record<string, boolean>;
  canManageSources?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const { live, start, stop, reset } = useAnswerStream();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState<ChatMessage | null>(null);
  const [image, setImage] = useState<{ mediaType: string; data: string; preview: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newResponse, setNewResponse] = useState(false);
  const docInput = useRef<HTMLInputElement>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);
  const composer = useRef<ComposerHandle>(null);
  const atBottom = useRef(true);
  const busy = live.running || uploading;
  useDraftGuard(!!input.trim() || !!image || busy);

  const scroll = (force = false) => requestAnimationFrame(() => { const el = streamRef.current; if (el && el.offsetParent !== null && (force || atBottom.current)) el.scrollTop = el.scrollHeight; });
  useEffect(() => { scroll(); }, [live.text, live.steps.length, messages.length]);

  async function send(text: string) {
    if ((!text.trim() && !image) || busy) return;
    const q = text.trim() || "Što je na ovoj slici i je li pravno relevantno?";
    const img = image;
    setInput(""); setImage(null); setError(null);
    const userMsg: ChatMessage = { id: uid(), role: "user", text: q, ts: new Date().toISOString(), hasImage: !!img };
    setPending(userMsg);
    atBottom.current = true; scroll(true);
    const result = await start(`/api/documents/${documentId}/chat/stream`, { message: q, image: img ? { mediaType: img.mediaType, data: img.data } : undefined });
    if (result.message) {
      setMessages((m) => [...m, userMsg, result.message as ChatMessage]);
      if (!atBottom.current || streamRef.current?.offsetParent === null) setNewResponse(true);
    } else {
      setInput(text); setImage(img);
      if (result.aborted) toast({ tone: "info", message: "Odgovor je zaustavljen. Pitanje je vraćeno u polje." });
      else setError(result.error ?? "Odgovor nije dostupan. Pokušajte ponovno.");
    }
    setPending(null);
    reset();
    composer.current?.focus();
  }

  async function attachDoc(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setError(null);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("file", f));
      const res = await fetch(`/api/documents/${documentId}/files`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Učitavanje nije uspjelo.");
      setMessages((m) => [...m, { id: uid(), role: "assistant", text: `Dodani dokumenti: ${data.added.join(", ")}. Sada su dio ovog razgovora.`, ts: new Date().toISOString() }]);
      toast({ message: data.added.length === 1 ? "Datoteka je dodana u razgovor." : `${data.added.length} datoteke dodane su u razgovor.` });
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Greška pri dodavanju dokumenta.");
    } finally {
      setUploading(false); scroll();
    }
  }

  function attachImage(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(f.type) || f.size > 5 * 1024 * 1024) { setError("Slika mora biti PNG, JPEG, WebP ili GIF, do 5 MB."); return; }
    const reader = new FileReader();
    reader.onload = () => { const url = String(reader.result); setImage({ mediaType: f.type || "image/png", data: url.split(",")[1] || "", preview: url }); };
    reader.readAsDataURL(f);
  }

  return (
    <div className="chat-glass-wrap">
      <div className="chat-wrap glass">
        <div className="chat-stream" ref={streamRef} aria-live="polite" aria-busy={busy} onScroll={() => { const el = streamRef.current; if (el) { atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; if (atBottom.current) setNewResponse(false); } }}>
          {messages.length === 0 && !pending && <div className="chat-welcome"><span className="welcome-icon"><IChat size={22} aria-hidden="true" /></span><h2>Što želite razjasniti?</h2><p>Pitajte o obvezama, rokovima ili rizicima. Odgovor citira odlomke dokumenta i relevantne propise.</p></div>}
          {messages.map((m) => m.role === "user"
            ? <div key={m.id} className="bubble user">{m.hasImage && <div className="bubble-img">Priložena slika</div>}<div className="msg-text">{m.text}</div></div>
            : <Assistant key={m.id} message={m} />)}
          {pending && <div className="bubble user">{pending.hasImage && <div className="bubble-img">Priložena slika</div>}<div className="msg-text">{pending.text}</div></div>}
          {live.running && <div className="bubble ai answer">
            <SearchTrace steps={live.steps} sources={live.sources} running={!live.text} />
            {live.calculation && <CalculationCard calc={live.calculation} />}
            {live.text && <RichAnswer text={live.text} sources={live.sources} streaming />}
          </div>}
          {uploading && <div className="bubble ai" role="status"><span className="typing"><i /><i /><i /><span>Dodajem dokument…</span></span></div>}
          {newResponse && <button type="button" className="btn btn-secondary btn-sm new-response" onClick={() => { atBottom.current = true; setNewResponse(false); scroll(true); }}><IArrowDown aria-hidden="true" />Novi odgovor</button>}
        </div>

        <div>
          {error && <div role="alert" className="flash err">{error}</div>}
          {messages.length <= 1 && !pending && (
            <div className="suggest" aria-label="Prijedlozi pitanja">
              {SUGGESTIONS.map((s) => <button key={s} type="button" className="chip" disabled={busy} onClick={() => send(s)}>{s}</button>)}
            </div>
          )}
          <div className="composer-scope"><span>Opseg: ovaj dokument, datoteke dodane u razgovor i uključeni propisi.</span><SourceChips enabled={sources} editable={canManageSources} /></div>
          <Composer
            ref={composer}
            label="Pitanje o dokumentu"
            placeholder="Pitajte bilo što o dokumentu…"
            value={input}
            onChange={setInput}
            onSubmit={() => send(input)}
            onStop={stop}
            busy={busy}
            canSubmit={!!input.trim() || !!image}
            above={image && (
              <div className="attach-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.preview} alt="Priložena slika" />
                <button type="button" className="x" aria-label="Ukloni sliku" onClick={() => setImage(null)}><IX size={12} /></button>
              </div>
            )}
            tools={<>
              <button type="button" disabled={busy} className="comp-icon" aria-label="Dodaj dokument u razgovor" title="Dodaj dokument u razgovor" onClick={() => docInput.current?.click()}><IPaperclip /></button>
              <button type="button" disabled={busy} className="comp-icon" aria-label="Priloži sliku" title="Priloži sliku" onClick={() => imgInput.current?.click()}><IImage /></button>
            </>}
          />
          <input ref={docInput} type="file" multiple accept=".pdf,.docx,.txt,.md" hidden onChange={(e) => { attachDoc(e.target.files); e.target.value = ""; }} />
          <input ref={imgInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { attachImage(e.target.files); e.target.value = ""; }} />
        </div>
      </div>
    </div>
  );
}
