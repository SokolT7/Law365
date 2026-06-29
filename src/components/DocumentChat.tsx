"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ChatMessage } from "@/lib/types";
import { IPaperclip, IImage, ISend } from "@/components/Icons";

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
}: {
  documentId: string;
  initialMessages: ChatMessage[];
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

  const scroll = () => {
    setTimeout(() => streamRef.current?.scrollTo(0, streamRef.current.scrollHeight), 50);
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
    } catch {
      setMessages((m) => [
        ...m,
        { id: uid(), role: "assistant", text: "Došlo je do pogreške.", ts: new Date().toISOString() },
      ]);
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
            text: `📎 Dodao sam: ${data.added.join(", ")}. Sada je dio ovog razgovora.`,
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
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      setImage({ mediaType: f.type || "image/png", data: url.split(",")[1] || "", preview: url });
    };
    reader.readAsDataURL(f);
  }

  return (
    <div className="card card-pad chat-wrap">
      <div className="chat-stream" ref={streamRef}>
        {messages.map((m) => (
          <div key={m.id} className={`bubble ${m.role}`}>
            {m.hasImage && <div className="bubble-img">🖼️ priložena slika</div>}
            <div style={{ whiteSpace: "pre-wrap" }}>{m.text}</div>
            {m.citations && m.citations.length > 0 && (
              <div className="cites">
                {m.citations.map((c, i) => (
                  <div key={i} className="cite">
                    <div className="c-head">{c.documentTitle} — {c.heading}</div>
                    <div className="c-snip">{c.snippet}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="bubble ai">Razmišljam…</div>}
      </div>

      <div>
        {error && <div className="flash err" style={{ marginBottom: 8 }}>{error}</div>}
        {messages.length <= 1 && (
          <div className="suggest">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="btn btn-sm" onClick={() => send(s)}>{s}</button>
            ))}
          </div>
        )}
        {image && (
          <div className="attach-preview">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.preview} alt="prilog" />
            <button type="button" className="x" onClick={() => setImage(null)}>×</button>
          </div>
        )}
        <form className="composer" onSubmit={(e) => { e.preventDefault(); send(input); }}>
          <button type="button" className="comp-icon" title="Dodaj dokument" onClick={() => docInput.current?.click()}>
            <IPaperclip size={18} />
          </button>
          <button type="button" className="comp-icon" title="Dodaj sliku" onClick={() => imgInput.current?.click()}>
            <IImage size={18} />
          </button>
          <input
            className="comp-text"
            placeholder="Pitajte bilo što o dokumentu…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button className="btn btn-primary comp-send" type="submit" disabled={busy}>
            <ISend size={16} />
          </button>
        </form>
        <input ref={docInput} type="file" multiple accept=".pdf,.docx,.txt,.md" style={{ display: "none" }}
          onChange={(e) => { attachDoc(e.target.files); e.target.value = ""; }} />
        <input ref={imgInput} type="file" accept="image/*" style={{ display: "none" }}
          onChange={(e) => { attachImage(e.target.files); e.target.value = ""; }} />
      </div>
    </div>
  );
}
