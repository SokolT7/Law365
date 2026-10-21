import { notFound } from "next/navigation";
import { readWorkspaceDB as readDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { allTemplates, evaluateTemplate } from "@/lib/review-templates";
import { reviewDocument } from "@/lib/review";
import PrintButton from "@/components/review/PrintButton";
import { BackLink } from "@/components/ui";

export const dynamic = "force-dynamic";

const STATUS = { obuhvaceno: "Obuhvaćeno", djelomicno: "Djelomično", nedostaje: "Nedostaje" } as const;
const SEV = { visoka: "Visoki rizik", srednja: "Srednji rizik", niska: "Napomena", ok: "Uredno" } as const;
const DECISION = { prihvaceno: "Prihvaćeno", odbaceno: "Odbačeno" } as const;

/** Print-ready review report (save as PDF from the browser's print dialog). */
export default async function ReviewReportPage({ searchParams }: { searchParams: Promise<{ dok?: string; predlozak?: string }> }) {
  const { dok, predlozak } = await searchParams;
  const session = await workspaceSession("contract_review");
  const db = await readDB();
  const doc = db.documents.find((d) => d.id === dok);
  if (!doc) notFound();
  const template = allTemplates(db.settings?.reviewTemplates).find((t) => t.id === predlozak);
  const chunks = db.chunks.filter((c) => c.documentId === doc.id);
  const client = db.clients.find((c) => c.id === doc.clientId);
  const generated = new Intl.DateTimeFormat("hr-HR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Zagreb" }).format(new Date());
  const results = template ? evaluateTemplate(template, chunks) : [];
  const findings = template ? [] : reviewDocument(db, doc);

  return <div className="report">
    <div className="report-toolbar no-print">
      <BackLink href={`/provjera?dok=${doc.id}${predlozak ? `&predlozak=${predlozak}` : ""}`} label="Provjera ugovora" />
      <PrintButton />
    </div>
    <article className="report-page">
      <header className="report-head">
        <p className="report-firm">{session.firm.name}</p>
        <h1>Izvještaj o provjeri ugovora</h1>
        <dl className="report-meta">
          <dt>Dokument</dt><dd>{doc.title}</dd>
          {client && client.name !== "Ručno učitani dokument" && <><dt>Klijent</dt><dd>{client.name}</dd></>}
          <dt>Predložak</dt><dd>{template ? template.name : "Pravila ureda"}</dd>
          <dt>Izradio</dt><dd>{session.user.name} · {generated}</dd>
        </dl>
        <p className="report-note">Provjera prema kriterijima predloška, bez AI obrade. Nalazi su pomoć pri pregledu i ne zamjenjuju stručnu ocjenu odvjetnika.</p>
      </header>

      {template ? <>
        <table className="report-summary"><tbody><tr>
          {(["nedostaje", "djelomicno", "obuhvaceno"] as const).map((s) => <td key={s}><b>{results.filter((r) => r.status === s).length}</b>{STATUS[s]}</td>)}
          <td><b>{results.filter((r) => doc.reviewDecisions?.[`${template.id}:${r.topic.id}`]?.status).length}/{results.length}</b>Pregledano</td>
        </tr></tbody></table>
        {results.map((r) => {
          const decision = doc.reviewDecisions?.[`${template.id}:${r.topic.id}`];
          return <section key={r.topic.id} className={`report-topic status-${r.status}`}>
            <h2>{r.topic.title} <span>{STATUS[r.status]}</span></h2>
            <p className="report-q">{r.topic.question}</p>
            <ul>{r.criteria.map((c) => <li key={c.label} className={c.found ? "found" : "missing"}>{c.found ? "✓" : "✗"} {c.label}{c.quote && <q>{c.quote}</q>}</li>)}</ul>
            {r.status !== "obuhvaceno" && <p><b>Preporuka:</b> {r.topic.recommendation}{r.topic.basis ? ` (${r.topic.basis})` : ""}</p>}
            {decision && <p className="report-decision"><b>Odluka:</b> {decision.status ? DECISION[decision.status] : "—"}{decision.comment ? ` · ${decision.comment}` : ""} <span>({decision.by})</span></p>}
          </section>;
        })}
      </> : findings.map((f, i) => <section key={i} className={`report-topic sev-${f.severity}`}>
        <h2>{f.title} <span>{SEV[f.severity]}</span></h2>
        <p>{f.detail}</p>
        {f.citat && <p><q>{f.citat}</q></p>}
        {f.temelj && <p><b>Temelj:</b> {f.temelj}</p>}
        {f.preporuka && <p><b>Preporuka:</b> {f.preporuka}</p>}
      </section>)}
      <footer className="report-foot">LTB Law · {session.firm.name} · {generated}</footer>
    </article>
  </div>;
}
