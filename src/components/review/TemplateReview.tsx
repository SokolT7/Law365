"use client";

import { useState } from "react";
import Link from "next/link";
import type { ReviewDecision } from "@/lib/types";
import type { TopicStatus } from "@/lib/review-templates";
import { Button } from "@/components/Button";
import { useToast } from "@/components/Feedback";
import { IAlert, ICheck, ICheckCircle, IChevronRight, IInfo, IX } from "@/components/Icons";

export interface TopicView {
  id: string; title: string; question: string; importance: "visoka" | "srednja" | "niska"; recommendation: string; basis?: string;
  status: TopicStatus;
  criteria: { label: string; found: boolean; quote?: string; heading?: string }[];
}

const STATUS_LABEL: Record<TopicStatus, string> = { obuhvaceno: "Obuhvaćeno", djelomicno: "Djelomično", nedostaje: "Nedostaje" };
const IMPORTANCE_LABEL = { visoka: "Visoka važnost", srednja: "Srednja važnost", niska: "Niska važnost" };

function tone(topic: TopicView): "ok" | "visoka" | "srednja" | "niska" {
  if (topic.status === "obuhvaceno") return "ok";
  if (topic.status === "nedostaje") return topic.importance === "niska" ? "srednja" : "visoka";
  return topic.importance === "visoka" ? "srednja" : "niska";
}

async function saveDecision(documentId: string, key: string, status: ReviewDecision["status"] | null, comment?: string) {
  const response = await fetch("/api/review/decisions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ documentId, key, status, comment }) });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error || "Odluka nije spremljena.");
  return (await response.json()).decision as ReviewDecision | null;
}

function TopicCard({ topic, documentId, templateId, decision, onDecision }: { topic: TopicView; documentId: string; templateId: string; decision?: ReviewDecision; onDecision: (key: string, d: ReviewDecision | null) => void }) {
  const toast = useToast();
  const key = `${templateId}:${topic.id}`;
  const [commenting, setCommenting] = useState(false);
  const [comment, setComment] = useState(decision?.comment ?? "");
  const [busy, setBusy] = useState(false);
  const t = tone(topic);
  const Icon = t === "ok" ? ICheck : t === "niska" ? IInfo : IAlert;

  async function decide(status: ReviewDecision["status"] | null) {
    const before = decision ?? null;
    const optimistic = status || decision?.comment ? { ...(decision ?? { by: "", at: "" }), status: status ?? undefined } : null;
    onDecision(key, optimistic);
    setBusy(true);
    try {
      const saved = await saveDecision(documentId, key, status);
      onDecision(key, saved);
      if (status) toast({ message: status === "prihvaceno" ? "Nalaz je prihvaćen." : "Nalaz je odbačen.", action: { label: "Poništi", onClick: () => { onDecision(key, before); saveDecision(documentId, key, before?.status ?? null).catch(() => toast({ tone: "error", message: "Poništavanje nije uspjelo." })); } } });
    } catch (err) {
      onDecision(key, before);
      toast({ tone: "error", message: err instanceof Error ? err.message : "Odluka nije spremljena." });
    } finally { setBusy(false); }
  }

  async function saveComment() {
    setBusy(true);
    try {
      const saved = await saveDecision(documentId, key, decision?.status ?? null, comment);
      onDecision(key, saved); setCommenting(false);
      toast({ message: comment.trim() ? "Komentar je spremljen." : "Komentar je uklonjen." });
    } catch (err) { toast({ tone: "error", message: err instanceof Error ? err.message : "Komentar nije spremljen." }); }
    finally { setBusy(false); }
  }

  const quotes = topic.criteria.filter((c) => c.quote);
  return <article className={`finding topic-card${decision?.status ? ` decided-${decision.status}` : ""}`}>
    <span className={`finding-icon ${t}`} aria-hidden="true"><Icon /></span>
    <div className="body">
      <div className="badges"><h3 className="f-title">{topic.title}</h3><span className={`badge ${t === "ok" ? "niska" : t === "niska" ? "info" : t}`}>{STATUS_LABEL[topic.status]}</span>{topic.status !== "obuhvaceno" && <span className="t-sub">{IMPORTANCE_LABEL[topic.importance]}</span>}</div>
      <p className="f-detail">{topic.question}</p>
      <ul className="criteria">{topic.criteria.map((c) => <li key={c.label} className={c.found ? "found" : "missing"}>{c.found ? <ICheck size={14} aria-hidden="true" /> : <IX size={14} aria-hidden="true" />}<span>{c.label}</span>{!c.found && <span className="sr-only">nije pronađeno</span>}</li>)}</ul>
      {topic.status !== "obuhvaceno" && <p className="meta-line"><b>Preporuka:</b> {topic.recommendation}{topic.basis && <span className="t-sub"> · {topic.basis}</span>}</p>}
      {quotes.length > 0 && <details>
        <summary><IChevronRight aria-hidden="true" />Odlomci iz ugovora ({quotes.length})</summary>
        {quotes.map((c) => <div key={c.label} className="clause-ref"><div className="ref-head">{c.label}{c.heading ? ` · ${c.heading}` : ""}</div>„{c.quote}”</div>)}
        <Link className="link" href={`/dokumenti/${documentId}?analiza=tekst`}>Otvori tekst dokumenta</Link>
      </details>}
      <div className="decision-row">
        <div className="segmented decision" role="group" aria-label={`Odluka: ${topic.title}`}>
          <button type="button" className={`seg${decision?.status === "prihvaceno" ? " active" : ""}`} aria-pressed={decision?.status === "prihvaceno"} disabled={busy} onClick={() => decide(decision?.status === "prihvaceno" ? null : "prihvaceno")}><ICheck size={14} aria-hidden="true" />Prihvaćeno</button>
          <button type="button" className={`seg${decision?.status === "odbaceno" ? " active" : ""}`} aria-pressed={decision?.status === "odbaceno"} disabled={busy} onClick={() => decide(decision?.status === "odbaceno" ? null : "odbaceno")}><IX size={14} aria-hidden="true" />Odbačeno</button>
        </div>
        {!commenting && <Button variant="ghost" size="sm" onClick={() => setCommenting(true)}>{decision?.comment ? "Uredi komentar" : "Dodaj komentar"}</Button>}
        {decision?.by && decision.status && <span className="t-sub">{decision.by} · {new Date(decision.at).toLocaleDateString("hr-HR")}</span>}
      </div>
      {decision?.comment && !commenting && <p className="decision-comment">{decision.comment}</p>}
      {commenting && <div className="comment-box">
        <label className="field"><span className="sr-only">Komentar</span><textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={2000} rows={3} placeholder="Napomena za kolege ili klijenta…" autoFocus /></label>
        <div className="badges"><Button size="sm" variant="primary" loading={busy} onClick={saveComment}>Spremi komentar</Button><Button size="sm" onClick={() => { setCommenting(false); setComment(decision?.comment ?? ""); }}>Odustani</Button></div>
      </div>}
    </div>
  </article>;
}

export default function TemplateReview({ documentId, templateId, topics, initialDecisions }: { documentId: string; templateId: string; topics: TopicView[]; initialDecisions: Record<string, ReviewDecision> }) {
  const [decisions, setDecisions] = useState(initialDecisions);
  const [filter, setFilter] = useState<TopicStatus | "all" | "open">("all");
  const counts = { obuhvaceno: 0, djelomicno: 0, nedostaje: 0 } as Record<TopicStatus, number>;
  topics.forEach((t) => counts[t.status]++);
  const decided = topics.filter((t) => decisions[`${templateId}:${t.id}`]?.status).length;
  const visible = topics.filter((t) => filter === "all" || (filter === "open" ? !decisions[`${templateId}:${t.id}`]?.status : t.status === filter));
  const order: Record<TopicStatus, number> = { nedostaje: 0, djelomicno: 1, obuhvaceno: 2 };
  const imp = { visoka: 0, srednja: 1, niska: 2 };
  visible.sort((a, b) => order[a.status] - order[b.status] || imp[a.importance] - imp[b.importance]);
  const onDecision = (key: string, d: ReviewDecision | null) => setDecisions((all) => { const next = { ...all }; if (d) next[key] = d; else delete next[key]; return next; });

  return <>
    <div className="risk-bar" role="group" aria-label="Filtriraj teme">
      <button type="button" className="risk-seg" aria-current={filter === "all" ? "page" : undefined} onClick={() => setFilter("all")}><b>{topics.length}</b>Sve teme</button>
      <button type="button" className="risk-seg visoka" aria-current={filter === "nedostaje" ? "page" : undefined} onClick={() => setFilter("nedostaje")}><span className="dot" aria-hidden="true" /><b>{counts.nedostaje}</b>Nedostaje</button>
      <button type="button" className="risk-seg srednja" aria-current={filter === "djelomicno" ? "page" : undefined} onClick={() => setFilter("djelomicno")}><span className="dot" aria-hidden="true" /><b>{counts.djelomicno}</b>Djelomično</button>
      <button type="button" className="risk-seg ok" aria-current={filter === "obuhvaceno" ? "page" : undefined} onClick={() => setFilter("obuhvaceno")}><span className="dot" aria-hidden="true" /><b>{counts.obuhvaceno}</b>Obuhvaćeno</button>
      <button type="button" className="risk-seg" aria-current={filter === "open" ? "page" : undefined} onClick={() => setFilter("open")}><ICheckCircle size={14} aria-hidden="true" /><b>{decided}/{topics.length}</b>Pregledano</button>
    </div>
    <div className="review-progress" aria-hidden="true"><span style={{ width: `${(decided / Math.max(1, topics.length)) * 100}%` }} /></div>
    <div className="card section-gap">
      {visible.length ? visible.map((t) => <TopicCard key={t.id} topic={t} documentId={documentId} templateId={templateId} decision={decisions[`${templateId}:${t.id}`]} onDecision={onDecision} />)
        : <div className="empty"><h3>Nema tema u ovom prikazu</h3><p>{filter === "open" ? "Sve teme su pregledane." : "Promijenite filtar."}</p></div>}
    </div>
  </>;
}
