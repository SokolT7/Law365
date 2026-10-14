"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatMessage } from "@/lib/types";
import { IPaperclip, IImage, ISend } from "@/components/Icons";
import { EvidenceButton } from "./EvidenceWorkspace";
import useDraftGuard from "./useDraftGuard";
import SourceChips from "@/components/SourceChips";

const SUGGESTIONS = [
  "O čemu je ovaj dokument?",
  "Koje su glavne obveze i rokovi?",
  "Na što da posebno pripazim?",
];

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : String(Math.random());
}

export default function DocumentChat({
  documentId,
  initialMessages,
  sources,
  canManageSources = false,
}: {
  documentId: string;
  initialMessages: ChatMessage[];
  sources: Record<string, boolean>;
  canManageSources?: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<{ mediaType: string; data: string; preview: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const docInput = useRef<HTMLInputElement>(null);
  const imgInput = useRef<HTMLInputElement>(null);
  const streamRef = useRef<HTMLDivElement>(null);

  useDraftGuard(!!input.trim() || !!image || busy);
  const [newResponse,setNewResponse]=useState(false);
  const atBottom = useRef(true);
  const scroll = () => {
    if (atBottom.current && streamRef.current?.offsetParent !== null) setTimeout(() => streamRef.current?.scrollTo(0, streamRef.current.scrollHeight), 50);
  };
  useEffect(() => {
    scroll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send(text: string) {
    if ((!text.trim() && !image) || busy) return;
    const q = text.trim() || "Što je na ovoj slici i je li pravno relevantno?";
    setInput("");
    const img = image;
    setImage(null);
    setMessages((m) => [
      ...m,
      { id: uid(), role: "user", text: q, ts: new Date().toISOString(), hasImage: !!img },
    ]);
    setBusy(true);
    setError(null);
    atBottom.current = true;
    scroll();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId,
          message: q,
          image: img ? { mediaType: img.mediaType, data: img.data } : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Odgovor nije dostupan.");
      if (!atBottom.current || streamRef.current?.offsetParent === null) setNewResponse(true);
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          text: data.answer || data.error || "Greška.",
          ts: new Date().toISOString(),
          citations: data.citations,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Odgovor nije dostupan. Pokušajte ponovno.");
      setInput(text);
      setImage(img);
      setMessages(m=>m.slice(0,-1));
    } finally {
      setBusy(false);
      scroll();
    }
  }

  async function attachDoc(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("file", f));
      const res = await fetch(`/api/documents/${documentId}/files`, { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok) {
        setMessages((m) => [
          ...m,
          {
            id: uid(),
            role: "assistant",
            text: `Dodani dokumenti: ${data.added.join(", ")}. Sada je dio ovog razgovora.`,
            ts: new Date().toISOString(),
          },
        ]);
        router.refresh();
      } else setError(data?.error || "Učitavanje nije uspjelo.");
    } catch {
      setError("Greška pri dodavanju dokumenta.");
    } finally {
      setBusy(false);
      scroll();
    }
  }

  function attachImage(files: FileList | null) {
    const f = files?.[0];
    if (!f) return;
    if (!["image/png","image/jpeg","image/webp","image/gif"].includes(f.type) || f.size > 5*1024*1024) {setError("Slika mora biti PNG, JPEG, WebP ili GIF, do 5 MB.");return;}
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setImage({ mediaType: f.type || "image/png", data: url.split(",")[1] || "", preview: url });
    };
    reader.readAsDataURL(f);
  }

  return (
    <div className="chat-glass-wrap">
    <div className="chat-wrap glass">
      <div className="chat-stream" ref={streamRef} onScroll={()=>{const el=streamRef.current;if(el)atBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<100;}}>
        {messages.length === 0 && <div className="chat-welcome"><span className="workspace-kicker">VAŠ DOKUMENT, U FOKUSU</span><h2>Što želite razjasniti?</h2><p>Postavite pitanje o ovom dokumentu. Izvore uz odgovor možete otvoriti bez napuštanja razgovora.</p></div>}
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            {m.hasImage && <div className="bubble-img">Priložena slika</div>}
            <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
            {m.citations && m.citations.length > 0 && (
              <div className="cites">
                {m.citations.map((c, i) => (
                  <EvidenceButton key={i} citation={c}/>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="bubble ai">Pripremam odgovor…</div>}
      </div>

      <div>
        {newResponse && <button type="button" className="btn btn-sm new-response" onClick={()=>{atBottom.current=true;setNewResponse(false);scroll();}}>Novi odgovor ↓</button>}
        {error && <div role="alert" className="flash err" style={{ marginBottom: 8 }}>{error}</div>}
        <p className="composer-scope">Opseg: ovaj dokument i datoteke dodane u ovaj razgovor.</p>
        <SourceChips enabled={sources} editable={canManageSources} />
        {messages.length <= 1 && (
          <div className="suggest">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="btn btn-sm" disabled={busy} onClick={() => setInput(s)}>{s}</button>
            ))}
          </div>
        )}
        {image && (
          <div className="attach-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.preview} alt="prilog" />
            <button type="button" className="x" aria-label="Ukloni sliku" onClick={() => setImage(null)}>×</button>
          </div>
        )}
        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <button type="button" disabled={busy} className="comp-icon" aria-label="Dodaj dokument" title="Dodaj dokument" onClick={() => docInput.current?.click()}>
            <IPaperclip size={18} />
          </button>
          <button type="button" disabled={busy} className="comp-icon" aria-label="Dodaj sliku" title="Dodaj sliku" onClick={() => imgInput.current?.click()}>
            <IImage size={18} />
          </button>
          <input
            aria-label="Pitanje o dokumentu"
            className="comp-text"
            placeholder="Pitajte bilo što o dokumentu…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button aria-label="Pošalji pitanje" className="btn btn-primary comp-send" type="submit" disabled={busy || (!input.trim() && !image)}>
            <ISend size={16} />
          </button>
        </form>
        <input ref={docInput} type="file" multiple accept=".pdf,.docx,.txt,.md" style={{ display: "none" }}
          onChange={(e) => { attachDoc(e.target.files); e.target.value = ""; }} />
        <input ref={imgInput} type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => { attachImage(e.target.files); e.target.value = ""; }} />
      </div>
    </div>
    </div>
  );
}
