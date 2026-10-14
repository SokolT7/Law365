"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReviewTemplate } from "@/lib/review-templates";
import { Button } from "@/components/Button";
import { useToast } from "@/components/Feedback";
import useDraftGuard from "@/components/useDraftGuard";
import { IArrowDown, IArrowUp, ICheck, IPlus, IX } from "@/components/Icons";

type Importance = "visoka" | "srednja" | "niska";
type CriterionDraft = { key: string; label: string; keywords: string; patterns?: string[] };
type TopicDraft = { key: string; id?: string; title: string; question: string; importance: Importance; recommendation: string; basis: string; criteria: CriterionDraft[] };
type Draft = { name: string; description: string; detectKeywords: string; detect: string[]; topics: TopicDraft[] };
type Preview = { id: string; title: string; status: "obuhvaceno" | "djelomicno" | "nedostaje"; criteria: { label: string; found: boolean; quote?: string }[] };

let seq = 0;
const k = () => `k${++seq}`;
const emptyCriterion = (): CriterionDraft => ({ key: k(), label: "", keywords: "" });
const emptyTopic = (): TopicDraft => ({ key: k(), title: "", question: "", importance: "srednja", recommendation: "", basis: "", criteria: [emptyCriterion()] });

function toDraft(t?: ReviewTemplate, copy = false): Draft {
  if (!t) return { name: "", description: "", detectKeywords: "", detect: [], topics: [emptyTopic()] };
  return {
    name: copy ? `${t.name} (ured)` : t.name, description: t.description, detectKeywords: (t.detectKeywords ?? []).join(", "), detect: t.detect ?? [],
    topics: t.topics.map((topic) => ({ key: k(), id: topic.id, title: topic.title, question: topic.question, importance: topic.importance, recommendation: topic.recommendation, basis: topic.basis ?? "",
      criteria: topic.criteria.map((c) => ({ key: k(), label: c.label, keywords: (c.keywords ?? []).join(", "), patterns: c.patterns })) })),
  };
}

function toPayload(d: Draft, id?: string) {
  const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
  return { id, name: d.name, description: d.description, detectKeywords: split(d.detectKeywords), detect: d.detect,
    topics: d.topics.map((t) => ({ id: t.id, title: t.title, question: t.question, importance: t.importance, recommendation: t.recommendation, basis: t.basis,
      criteria: t.criteria.map((c) => ({ label: c.label, keywords: split(c.keywords), patterns: c.keywords.trim() ? undefined : c.patterns })) })) };
}

const STATUS = { obuhvaceno: "Obuhvaćeno", djelomicno: "Djelomično", nedostaje: "Nedostaje" };

export default function TemplateEditor({ template, copyFrom, documents, canEdit }: {
  template?: ReviewTemplate; copyFrom?: ReviewTemplate; documents: { id: string; title: string }[]; canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const initial = useMemo(() => toDraft(template ?? copyFrom, !!copyFrom), [template, copyFrom]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [docId, setDocId] = useState(documents[0]?.id ?? "");
  const [preview, setPreview] = useState<Preview[] | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  useDraftGuard(dirty && !saving);

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setTopic = (key: string, patch: Partial<TopicDraft>) => setDraft((d) => ({ ...d, topics: d.topics.map((t) => (t.key === key ? { ...t, ...patch } : t)) }));
  const setCriterion = (topicKey: string, critKey: string, patch: Partial<CriterionDraft>) => setDraft((d) => ({ ...d, topics: d.topics.map((t) => (t.key !== topicKey ? t : { ...t, criteria: t.criteria.map((c) => (c.key === critKey ? { ...c, ...patch } : c)) })) }));
  const move = (index: number, delta: number) => setDraft((d) => { const topics = [...d.topics]; const [t] = topics.splice(index, 1); topics.splice(index + delta, 0, t); return { ...d, topics }; });

  // Live test against a real contract (debounced).
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!docId) return;
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setPreviewing(true);
      try {
        const response = await fetch("/api/review/preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ template: toPayload(draft), documentId: docId }) });
        const data = await response.json();
        if (!response.ok) { setPreviewError(data.error || "Predložak još nije potpun."); setPreview(null); }
        else { setPreviewError(""); setPreview(data.results); }
      } catch { setPreviewError("Provjera trenutačno nije dostupna."); }
      finally { setPreviewing(false); }
    }, 700);
    return () => clearTimeout(timer.current);
  }, [draft, docId]);

  async function save() {
    setSaving(true); setError("");
    try {
      const response = await fetch("/api/review/templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(toPayload(draft, template?.id)) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Predložak nije spremljen.");
      toast({ message: template ? "Predložak je spremljen." : `Predložak „${data.template.name}” je dodan.` });
      router.push("/provjera/predlosci");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Predložak nije spremljen.");
      setSaving(false);
    }
  }

  const disabled = !canEdit;
  return <div className="template-editor">
    <div className="template-main">
      <section className="card card-pad form-stack">
        <div className="grid grid-2">
          <label className="field">Naziv predloška<input value={draft.name} disabled={disabled} maxLength={80} onChange={(e) => set({ name: e.target.value })} placeholder="npr. Ugovor o licenci softvera" /></label>
          <label className="field">Prepoznavanje vrste ugovora <small>ključne riječi, odvojene zarezom</small><input value={draft.detectKeywords} disabled={disabled} onChange={(e) => set({ detectKeywords: e.target.value })} placeholder={draft.detect.length && !draft.detectKeywords ? "Koristi ugrađeno prepoznavanje LTB" : "licenc*, softver*, korisnik"} /></label>
        </div>
        <label className="field">Opis <small>neobavezno</small><input value={draft.description} disabled={disabled} maxLength={240} onChange={(e) => set({ description: e.target.value })} placeholder="Što predložak provjerava" /></label>
        <p className="t-sub">Ključne riječi pretražuju se bez obzira na dijakritike i velika slova. Zvjezdica označava bilo koji nastavak riječi (npr. <code>jamčevin*</code>).</p>
      </section>

      {draft.topics.map((topic, index) => <section key={topic.key} className="card card-pad topic-editor" aria-label={`Tema ${index + 1}`}>
        <div className="topic-editor-head">
          <span className="cite-num" aria-hidden="true">{index + 1}</span>
          <label className="field topic-title"><span className="sr-only">Naslov teme</span><input value={topic.title} disabled={disabled} maxLength={120} onChange={(e) => setTopic(topic.key, { title: e.target.value })} placeholder="Naslov teme, npr. Ograničenje odgovornosti" /></label>
          {canEdit && <div className="topic-tools">
            <Button variant="ghost" size="sm" iconOnly icon={<IArrowUp />} disabled={index === 0} onClick={() => move(index, -1)}>Pomakni temu gore</Button>
            <Button variant="ghost" size="sm" iconOnly icon={<IArrowDown />} disabled={index === draft.topics.length - 1} onClick={() => move(index, 1)}>Pomakni temu dolje</Button>
            <Button variant="ghost" size="sm" iconOnly icon={<IX />} disabled={draft.topics.length === 1} onClick={() => setDraft((d) => ({ ...d, topics: d.topics.filter((t) => t.key !== topic.key) }))}>Ukloni temu</Button>
          </div>}
        </div>
        <div className="grid grid-2">
          <label className="field">Pitanje za pregled<input value={topic.question} disabled={disabled} maxLength={300} onChange={(e) => setTopic(topic.key, { question: e.target.value })} placeholder="Što odvjetnik provjerava?" /></label>
          <div className="field"><span id={`imp-${topic.key}`}>Važnost ako nedostaje</span>
            <div className="segmented" role="radiogroup" aria-labelledby={`imp-${topic.key}`}>
              {(["visoka", "srednja", "niska"] as const).map((v) => <button key={v} type="button" role="radio" aria-checked={topic.importance === v} disabled={disabled} className={`seg${topic.importance === v ? " active" : ""}`} onClick={() => setTopic(topic.key, { importance: v })}>{v === "visoka" ? "Visoka" : v === "srednja" ? "Srednja" : "Niska"}</button>)}
            </div>
          </div>
        </div>
        <div className="criteria-editor">
          <span className="field-label">Kriteriji <small className="t-sub">— tema je obuhvaćena kad su pronađeni svi kriteriji</small></span>
          {topic.criteria.map((c) => <div key={c.key} className="criterion-row">
            <input aria-label="Naziv kriterija" value={c.label} disabled={disabled} maxLength={120} onChange={(e) => setCriterion(topic.key, c.key, { label: e.target.value })} placeholder="Naziv kriterija" />
            <input aria-label="Ključne riječi" value={c.keywords} disabled={disabled} onChange={(e) => setCriterion(topic.key, c.key, { keywords: e.target.value })} placeholder={c.patterns?.length && !c.keywords ? "Koristi ugrađeni uzorak LTB — upišite riječi za zamjenu" : "ključne riječi, odvojene zarezom"} />
            {c.patterns?.length && !c.keywords ? <span className="badge info" title="Provjereni uzorak iz predloška LTB Law">LTB uzorak</span> : null}
            {canEdit && <Button variant="ghost" size="sm" iconOnly icon={<IX />} disabled={topic.criteria.length === 1} onClick={() => setTopic(topic.key, { criteria: topic.criteria.filter((x) => x.key !== c.key) })}>Ukloni kriterij</Button>}
          </div>)}
          {canEdit && topic.criteria.length < 10 && <Button variant="ghost" size="sm" icon={<IPlus />} onClick={() => setTopic(topic.key, { criteria: [...topic.criteria, emptyCriterion()] })}>Dodaj kriterij</Button>}
        </div>
        <div className="grid grid-2">
          <label className="field">Preporuka ako nedostaje<textarea value={topic.recommendation} disabled={disabled} maxLength={600} rows={2} onChange={(e) => setTopic(topic.key, { recommendation: e.target.value })} /></label>
          <label className="field">Pravni temelj <small>neobavezno</small><input value={topic.basis} disabled={disabled} maxLength={200} onChange={(e) => setTopic(topic.key, { basis: e.target.value })} placeholder="npr. ZOO čl. 345." /></label>
        </div>
      </section>)}
      {canEdit && draft.topics.length < 30 && <Button icon={<IPlus />} onClick={() => setDraft((d) => ({ ...d, topics: [...d.topics, emptyTopic()] }))}>Dodaj temu</Button>}

      {canEdit && <div className="admin-save-bar template-save">
        <div><strong>{dirty ? "Nespremljene promjene" : "Sve je spremljeno"}</strong><small>{draft.topics.length} {new Intl.PluralRules("hr-HR").select(draft.topics.length) === "few" ? "teme" : "tema"} · {draft.topics.reduce((n, t) => n + t.criteria.length, 0)} kriterija</small></div>
        {error && <p className="review-error" role="alert">{error}</p>}
        <div className="badges"><Button onClick={() => router.push("/provjera/predlosci")}>Odustani</Button><Button variant="primary" icon={<ICheck />} loading={saving} disabled={!dirty && !!template} onClick={save}>Spremi predložak</Button></div>
      </div>}
    </div>

    <aside className="card card-pad template-preview" aria-label="Isprobaj predložak">
      <h3 className="upload-heading">Isprobaj na ugovoru</h3>
      {documents.length ? <label className="field"><span className="sr-only">Dokument</span><select value={docId} onChange={(e) => setDocId(e.target.value)}>{documents.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select></label>
        : <p className="t-sub">Učitajte ugovor kako biste isprobali predložak.</p>}
      {previewing && <p className="t-sub" role="status"><span className="btn-spinner" aria-hidden="true" /> Provjeravam…</p>}
      {previewError && <p className="t-sub preview-error">{previewError}</p>}
      {preview && <ul className="preview-list">{preview.map((p) => <li key={p.id} className={`status-${p.status}`}>
        <div className="preview-topic"><b>{p.title}</b><span>{STATUS[p.status]}</span></div>
        <ul>{p.criteria.map((c) => <li key={c.label} className={c.found ? "found" : "missing"} title={c.quote}>{c.found ? "✓" : "✗"} {c.label}</li>)}</ul>
      </li>)}</ul>}
    </aside>
  </div>;
}
