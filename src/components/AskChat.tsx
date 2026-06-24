"use client";

import { useRef, useState } from "react";
import { ISearch } from "@/components/Icons";

interface Citation {
  documentTitle: string;
  heading: string;
  snippet: string;
}
interface Msg {
  role: "user" | "ai";
  text: string;
  citations?: Citation[];
}

const SUGGESTIONS = [
  "Koliki je rok plaćanja u IT ugovoru?",
  "Koji ugovori imaju automatsko produljenje?",
  "Gdje nije ugovoreno hrvatsko mjerodavno pravo?",
  "Koji je otkazni rok u ugovoru o najmu?",
];

export default function AskChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const streamRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    setTimeout(() => streamRef.current?.scrollTo(0, streamRef.current.scrollHeight), 50);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "ai", text: data.answer, citations: data.citations }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "ai", text: "Došlo je do pogreške pri dohvaćanju odgovora." },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => streamRef.current?.scrollTo(0, streamRef.current.scrollHeight), 50);
    }
  }

  return (
    <div className="card card-pad chat-wrap">
      <div className="chat-stream" ref={streamRef}>
        {messages.length === 0 && (
          <div className="empty">
            Postavite pitanje o ugovorima ureda. Svaki odgovor temelji se isključivo na vašim
            dokumentima i navodi izvor.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <div>{m.text}</div>
            {m.citations && m.citations.length > 0 && (
              <div className="cites">
                {m.citations.map((c, j) => (
                  <div key={j} className="cite">
                    <div className="c-head">
                      {c.documentTitle} — {c.heading}
                    </div>
                    <div className="c-snip">{c.snippet}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="bubble ai">Pretražujem dokumente…</div>}
      </div>

      <div>
        {messages.length === 0 && (
          <div className="suggest">
            {SUGGESTIONS.map((s) => (
              <button key={s} className="btn btn-sm" onClick={() => ask(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <input
            placeholder="Postavite pitanje o ugovorima…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button className="btn btn-primary" type="submit" disabled={busy}>
            <ISearch size={15} /> Pitaj
          </button>
        </form>
      </div>
    </div>
  );
}
