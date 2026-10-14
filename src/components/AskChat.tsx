"use client";

import { useRef, useState } from "react";
import { EvidenceButton } from "./EvidenceWorkspace";
import { useResearchDraft } from "./ResearchDraft";
import useDraftGuard from "./useDraftGuard";
import { ISearch } from "@/components/Icons";

interface Citation {
  documentId?: string;
  chunkId?: string;
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
  "Koji su rokovi plaćanja u dokumentima?",
  "Koji ugovori imaju automatsko produljenje?",
  "Gdje nije ugovoreno hrvatsko mjerodavno pravo?",
  "Koje su obveze ugovornih strana?",
];

export default function AskChat({hasDocumentSource}:{hasDocumentSource:boolean}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const {draft:input,setDraft:setInput}=useResearchDraft();
  const [newResponse,setNewResponse]=useState(false);
  const [error,setError] = useState("");
  const atBottom = useRef(true);
  const [busy, setBusy] = useState(false);
  useDraftGuard(!!input.trim() || busy);
  const streamRef = useRef<HTMLDivElement>(null);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }]);
    setBusy(true);
    setError("");
    atBottom.current=true;
    setTimeout(() => streamRef.current?.scrollTo(0, streamRef.current.scrollHeight), 50);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      if(!res.ok) throw new Error(data.error || "Odgovor nije dostupan.");
      if(!atBottom.current)setNewResponse(true);
      setMessages((m) => [...m, { role: "ai", text: data.answer, citations: data.citations }]);
    } catch(e) {
      setMessages(m=>m.slice(0,-1));
      setInput(question);
      setError(e instanceof Error?e.message:"Odgovor nije dostupan.");
    } finally {
      setBusy(false);
      if(atBottom.current) setTimeout(() => streamRef.current?.scrollTo(0, streamRef.current.scrollHeight), 50);
    }
  }

  return (
    <div className="card card-pad chat-wrap">
      <div className="chat-stream" ref={streamRef} onScroll={()=>{const el=streamRef.current;if(el)atBottom.current=el.scrollHeight-el.scrollTop-el.clientHeight<100;}}>
        {messages.length === 0 && (
          <div className="empty">
            <div className="chat-welcome"><span className="workspace-kicker">ISTRAŽIVANJE S KONTEKSTOM</span><h2>Koje pitanje želite razjasniti?</h2><p>Pretražite dostupne dokumente. Otvorite reference uz odgovor i provjerite izdvojene odlomke.</p></div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <div style={{whiteSpace:"pre-wrap"}}>{m.text}</div>
            {m.citations && m.citations.length > 0 && (
              <div className="cites">
                {m.citations.map((c, j) => (
                  <EvidenceButton key={j} citation={c}/>
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
              <button key={s} className="btn btn-sm" disabled={busy} onClick={() => setInput(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
        {newResponse && <button className="btn btn-sm new-response" onClick={()=>{atBottom.current=true;setNewResponse(false);streamRef.current?.scrollTo(0,streamRef.current.scrollHeight);}}>Novi odgovor ↓</button>}
        <p className="composer-scope">{hasDocumentSource ? "Opseg: dostupni dokumenti vašeg ureda." : "Trenutačno nema uključenog izvora dokumenata."} Vanjski izvori nisu povezani.</p>
        {error&&<p role="alert" className="flash err">{error}</p>}
        <form
          className="composer"
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
        >
          <input
            aria-label="Pravno pitanje"
            placeholder="Postavite pitanje o ugovorima…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={busy}
          />
          <button className="btn btn-primary" type="submit" disabled={busy || !input.trim()}>
            <ISearch size={15} /> Pitaj
          </button>
        </form>
      </div>
    </div>
  );
}
