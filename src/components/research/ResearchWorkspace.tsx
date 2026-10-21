"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ResearchMessage, ResearchThread } from "@/lib/research/types";
import type { Playbook } from "@/lib/research/playbooks";
import EvidenceWorkspace, { useEvidence } from "@/components/EvidenceWorkspace";
import Composer, { type ComposerHandle } from "@/components/Composer";
import { AnswerActions, CalculationCard, RichAnswer, SearchTrace, SourceSummary, VerificationNote } from "@/components/research/Answer";
import { useAnswerStream } from "@/components/research/useAnswerStream";
import { useResearchDraft } from "@/components/ResearchDraft";
import useDraftGuard from "@/components/useDraftGuard";
import { useConfirm, useToast } from "@/components/Feedback";
import { Button } from "@/components/Button";
import { IArrowDown, IBook, IChat, IChevronDown, IPlus, ISearch, ISpark, IX } from "@/components/Icons";
import { fold } from "@/components/shell/CommandPalette";

export type ThreadSummary = { id: string; title: string; updatedAt: string; messages: number };
type Starter = { group: string; items: { title: string; prompt: string }[] };

function relative(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "upravo";
  const rtf = new Intl.RelativeTimeFormat("hr-HR", { numeric: "auto" });
  if (minutes < 60) return rtf.format(-minutes, "minute");
  if (minutes < 1440) return rtf.format(-Math.round(minutes / 60), "hour");
  if (minutes < 10080) return rtf.format(-Math.round(minutes / 1440), "day");
  return new Date(iso).toLocaleDateString("hr-HR", { day: "numeric", month: "short" });
}

function AssistantMessage({ message }: { message: ResearchMessage }) {
  const sources = message.sources ?? [];
  return <div className="bubble ai answer">
    {message.steps?.length ? <SearchTrace steps={message.steps} sources={sources} running={false} /> : null}
    {message.calculation && <CalculationCard calc={message.calculation} />}
    <RichAnswer text={message.text} sources={sources} />
    {message.stopped && <p className="t-sub">Odgovor je zaustavljen prije završetka.</p>}
    <div className="answer-foot">
      <VerificationNote verification={message.verification} />
      <SourceSummary sources={sources} />
      <AnswerActions text={message.text} />
    </div>
  </div>;
}

/** Opens the latest answer's sources in the evidence pane when a thread loads. */
function SourceSync({ messages }: { messages: ResearchMessage[] }) {
  const evidence = useEvidence();
  const last = [...messages].reverse().find((m) => m.role === "assistant" && m.sources?.length);
  const id = last?.id;
  useEffect(() => { if (last?.sources && evidence && window.matchMedia("(min-width: 1200px)").matches) evidence.showSources(last.sources); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [id]);
  return null;
}

export default function ResearchWorkspace({ initialThreads, initialThread, initialPlaybookId, initialClientId, playbooks, starters, sourceScope, hasDocumentSource, clients = [] }: {
  initialThreads: ThreadSummary[];
  initialThread?: ResearchThread;
  initialPlaybookId?: string;
  initialClientId?: string;
  playbooks: Playbook[];
  starters: Starter[];
  sourceScope: { enabled: string[]; available: number };
  hasDocumentSource: boolean;
  clients?: { id: string; name: string }[];
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const { draft: input, setDraft: setInput, submitOnArrival } = useResearchDraft();
  const { live, start, stop, reset } = useAnswerStream();
  const [threads, setThreads] = useState(initialThreads);
  const [threadId, setThreadId] = useState<string | undefined>(initialThread?.id);
  const [messages, setMessages] = useState<ResearchMessage[]>(initialThread?.messages ?? []);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [playbookId, setPlaybookId] = useState<string | undefined>(() => [...(initialThread?.messages ?? [])].reverse().find((m) => m.playbookId)?.playbookId ?? (playbooks.some((p) => p.id === initialPlaybookId) ? initialPlaybookId : undefined));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [clientId, setClientId] = useState(initialThread?.clientId ?? initialClientId ?? "");
  const [historyQuery, setHistoryQuery] = useState("");
  const [loadingThread, setLoadingThread] = useState(false);
  const [newResponse, setNewResponse] = useState(false);
  const composer = useRef<ComposerHandle>(null);
  const stream = useRef<HTMLDivElement>(null);
  const atBottom = useRef(true);
  const playbook = playbooks.find((p) => p.id === playbookId);
  useDraftGuard(!!input.trim() || live.running);

  const scrollDown = (force = false) => requestAnimationFrame(() => { if ((force || atBottom.current) && stream.current) stream.current.scrollTop = stream.current.scrollHeight; });
  useEffect(() => { if (messages.length || live.running) scrollDown(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [live.text, live.steps.length, messages.length]);

  async function ask(question: string) {
    const q = question.trim();
    if (!q || live.running) return;
    setError(""); setInput(""); setPending(q); atBottom.current = true; scrollDown(true);
    let resolvedId = threadId;
    const result = await start("/api/research/stream", { question: q, threadId, playbookId, clientId: clientId || undefined }, {
      onThread: (id) => {
        resolvedId = id;
        if (!threadId) {
          setThreadId(id);
          window.history.replaceState(null, "", `/pitanja?nit=${id}`);
          setThreads((all) => [{ id, title: q.length > 90 ? `${q.slice(0, 90)}…` : q, updatedAt: new Date().toISOString(), messages: 0 }, ...all.filter((t) => t.id !== id)]);
        }
      },
    });
    if (result.message) {
      setMessages((all) => [...all, { id: `u-${Date.now()}`, role: "user", text: q, ts: new Date().toISOString(), playbookId }, result.message!]);
      setThreads((all) => all.map((t) => (t.id === resolvedId ? { ...t, updatedAt: new Date().toISOString(), messages: t.messages + 2 } : t)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      if (!atBottom.current) setNewResponse(true);
    } else if (result.aborted) {
      setInput(q);
      toast({ tone: "info", message: "Istraživanje je zaustavljeno. Pitanje je vraćeno u polje." });
    } else {
      setInput(q);
      setError(result.error ?? "Odgovor trenutačno nije dostupan.");
    }
    setPending(null);
    reset();
    composer.current?.focus();
  }

  // Questions typed on the dashboard are asked as soon as this page opens.
  useEffect(() => {
    if (submitOnArrival.current && input.trim()) { submitOnArrival.current = false; ask(input); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openThread(id: string) {
    if (live.running || id === threadId) return;
    setLoadingThread(true); setError("");
    try {
      const response = await fetch(`/api/research/threads/${id}`, { cache: "no-store" });
      if (!response.ok) throw new Error();
      const { thread } = (await response.json()) as { thread: ResearchThread };
      setThreadId(thread.id); setMessages(thread.messages); setClientId(thread.clientId ?? "");
      setPlaybookId([...thread.messages].reverse().find((m) => m.playbookId)?.playbookId);
      window.history.replaceState(null, "", `/pitanja?nit=${thread.id}`);
      atBottom.current = true; scrollDown(true);
    } catch {
      toast({ tone: "error", message: "Istraživanje nije moguće otvoriti." });
    } finally {
      setLoadingThread(false);
    }
  }

  function newThread() {
    if (live.running) return;
    setThreadId(undefined); setMessages([]); setError(""); setClientId(initialClientId ?? "");
    window.history.replaceState(null, "", "/pitanja");
    composer.current?.focus();
  }

  async function removeThread(thread: ThreadSummary) {
    if (!(await confirm({ title: "Obrisati istraživanje?", body: `„${thread.title}” i svi odgovori u njemu bit će trajno uklonjeni.`, confirmLabel: "Obriši istraživanje", destructive: true }))) return;
    const response = await fetch(`/api/research/threads/${thread.id}`, { method: "DELETE" });
    if (!response.ok) { toast({ tone: "error", message: "Brisanje nije uspjelo." }); return; }
    setThreads((all) => all.filter((t) => t.id !== thread.id));
    if (thread.id === threadId) newThread();
    toast({ message: "Istraživanje je obrisano." });
  }

  const shownThreads = useMemo(() => threads.filter((t) => !historyQuery || fold(t.title).includes(fold(historyQuery))), [threads, historyQuery]);
  const empty = !messages.length && !pending;

  return <div className="research-layout">
    <aside className="research-history" aria-label="Povijest istraživanja">
      <Button variant="secondary" block icon={<IPlus />} onClick={newThread} disabled={live.running}>Novo istraživanje</Button>
      <label className="search-field"><ISearch aria-hidden="true" /><span className="sr-only">Pretraži povijest</span><input type="search" value={historyQuery} onChange={(e) => setHistoryQuery(e.target.value)} placeholder="Pretraži povijest…" /></label>
      <nav className="thread-list" aria-label="Istraživanja">
        {shownThreads.length ? shownThreads.map((t) => <div key={t.id} className={`thread-item${t.id === threadId ? " active" : ""}`}>
          <button type="button" onClick={() => openThread(t.id)} aria-current={t.id === threadId ? "true" : undefined}><span className="thread-title">{t.title}</span><span className="t-sub">{relative(t.updatedAt)}</span></button>
          <button type="button" className="thread-delete" aria-label={`Obriši: ${t.title}`} title="Obriši istraživanje" onClick={() => removeThread(t)}><IX size={14} /></button>
        </div>) : <p className="t-sub thread-empty">{historyQuery ? "Nema istraživanja za tu pretragu." : "Vaša istraživanja pojavit će se ovdje. Vidljiva su samo vama."}</p>}
      </nav>
    </aside>

    <EvidenceWorkspace>
      <SourceSync messages={messages} />
      <div className="chat-glass-wrap">
        <div className="chat-wrap glass research-chat">
          <div className="chat-stream" ref={stream} aria-live="polite" aria-busy={live.running || loadingThread} onScroll={() => { const el = stream.current; if (el) { atBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120; if (atBottom.current) setNewResponse(false); } }}>
            {empty && <div className="research-empty">
              <div className="chat-welcome"><span className="welcome-icon"><ISpark size={22} aria-hidden="true" /></span><h2>{playbook ? playbook.name : "Što želite istražiti?"}</h2>
                {playbook && <p>{playbook.description}</p>}</div>
              {playbook?.starters?.length ? <div className="starter-group"><h3>Predlošci asistenta</h3>{playbook.starters.map((s) => <button key={s} type="button" className="starter" onClick={() => { setInput(s); composer.current?.focus(); }}><span>{s}</span><IChevronDown className="starter-arrow" aria-hidden="true" /></button>)}</div> : null}
              <div className="starter-grid">{starters.map((g) => <div key={g.group} className="starter-group"><h3>{g.group}</h3>
                {g.items.map((it) => <button key={it.title} type="button" className="starter" title={it.prompt} onClick={() => { setInput(it.prompt); composer.current?.focus(); }}><span>{it.title}</span><IChevronDown className="starter-arrow" aria-hidden="true" /></button>)}
              </div>)}</div>
            </div>}
            {messages.map((m) => m.role === "user" ? <div key={m.id} className="bubble user"><div className="msg-text">{m.text}</div></div> : <AssistantMessage key={m.id} message={m} />)}
            {pending && <div className="bubble user"><div className="msg-text">{pending}</div></div>}
            {(live.running || (pending && live.text)) && <div className="bubble ai answer">
              <SearchTrace steps={live.steps} sources={live.sources} running={live.running && !live.text} />
              {live.calculation && <CalculationCard calc={live.calculation} />}
              {live.text ? <RichAnswer text={live.text} sources={live.sources} streaming /> : null}
            </div>}
            {newResponse && <button type="button" className="btn btn-secondary btn-sm new-response" onClick={() => { atBottom.current = true; setNewResponse(false); scrollDown(true); }}><IArrowDown aria-hidden="true" />Novi odgovor</button>}
          </div>

          <div>
            {error && <p role="alert" className="flash err">{error}</p>}
            <div className="composer-scope">
              <div className="scope-picker">
                <button type="button" className={`chip${playbook ? " selected" : ""}`} aria-haspopup="listbox" aria-expanded={pickerOpen} onClick={() => setPickerOpen((v) => !v)}><IChat size={14} aria-hidden="true" />{playbook ? `Asistent: ${playbook.name}` : "Asistent: opći"}<IChevronDown size={14} aria-hidden="true" /></button>
                {pickerOpen && <div className="menu up playbook-menu" role="listbox" aria-label="Asistent">
                  <button type="button" role="option" aria-selected={!playbook} className="menu-item" onClick={() => { setPlaybookId(undefined); setPickerOpen(false); }}><span><b>Opći istraživač</b><small>Sva područja prava</small></span></button>
                  {playbooks.map((p) => <button key={p.id} type="button" role="option" aria-selected={p.id === playbookId} className="menu-item" onClick={() => { setPlaybookId(p.id); setPickerOpen(false); composer.current?.focus(); }}><span><b>{p.name}{!p.builtIn && <span className="badge info">Ured</span>}</b><small>{p.description}</small></span></button>)}
                </div>}
              </div>
              {clients.length > 0 && hasDocumentSource && <label className={`chip chip-select${clientId ? " selected" : ""}`} title="Ograničite dokumente ureda na jednog klijenta">
                <span className="sr-only">Opseg dokumenata</span>
                <select value={clientId} disabled={!!threadId && messages.length > 0} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">Svi klijenti</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>}
              <Link className="chip" href="/izvori" title={sourceScope.enabled.join(", ")}><IBook size={14} aria-hidden="true" />Izvori {sourceScope.enabled.length}/{sourceScope.available}</Link>
              {!hasDocumentSource && <span className="t-sub">Dokumenti ureda nisu uključeni.</span>}
            </div>
            <Composer ref={composer} label="Pravno pitanje" placeholder={playbook ? `Pitanje za asistenta „${playbook.name}”…` : "Postavite pravno pitanje…"} value={input} onChange={setInput} onSubmit={() => ask(input)} onStop={stop} busy={live.running} />
            <p className="ai-disclaimer">AI prijedlog · provjerite izvore prije oslanjanja. Ne predstavlja pravni savjet.</p>
          </div>
        </div>
      </div>
    </EvidenceWorkspace>
  </div>;
}
