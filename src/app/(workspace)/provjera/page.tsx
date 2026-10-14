import { activeClientScope } from "@/lib/scope";
import ScopeNotice from "@/components/shell/ScopeNotice";
import Link from "next/link";
import ReviewDocumentSelector from "@/components/ReviewDocumentSelector";
import { queryValue, listHref, type ListParams } from "@/lib/list-query";
import { readWorkspaceDB as readDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { hasFeature } from "@/lib/features";
import { PageHeader, EmptyState } from "@/components/ui";
import { UploadButton } from "@/components/shell/SearchTrigger";
import SourcesDropdown from "@/components/SourcesDropdown";
import { firmSources } from "@/lib/research/firm-sources";
import { reviewDocument } from "@/lib/review";
import { allTemplates, evaluateTemplate, suggestTemplate } from "@/lib/review-templates";
import TemplateReview, { type TopicView } from "@/components/review/TemplateReview";
import { IShield, ICheck, IAlert, IInfo, IChevronRight, IArrowRight } from "@/components/Icons";

export const dynamic = "force-dynamic";

const SEVERITIES = ["visoka", "srednja", "niska", "ok"] as const;
const SEV_LABEL: Record<string, string> = { visoka: "Visoki rizik", srednja: "Srednji rizik", niska: "Napomena", ok: "Uredno" };
const SEV_BADGE: Record<string, string> = { visoka: "visoka", srednja: "srednja", niska: "info", ok: "niska" };
const SEV_ICON = { visoka: IAlert, srednja: IAlert, niska: IInfo, ok: ICheck };
const INTERNAL_CLIENT = "Ručno učitani dokument";

export default async function ReviewPage({ searchParams }: { searchParams: Promise<ListParams> }) {
  const params = await searchParams;
  const dok = queryValue(params, "dok"), rizik = queryValue(params, "rizik"), predlozak = queryValue(params, "predlozak");
  const session = await workspaceSession("contract_review");
  const db = await readDB();
  const scope = hasFeature(session.firm, "clients") ? await activeClientScope(db) : null;
  const docs = [...db.documents].filter((d) => !scope || d.clientId === scope.id || d.id === dok).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const selected = dok ? docs.find((d) => d.id === dok) : undefined;
  const order = { visoka: 0, srednja: 1, niska: 2, ok: 3 };
  const findings = selected ? reviewDocument(db, selected).sort((a, b) => order[a.severity] - order[b.severity]) : [];
  const visible = findings.filter((f) => !rizik || f.severity === rizik);
  const risky = findings.filter((f) => f.severity !== "ok");
  const clientOf = (id: string) => { const name = db.clients.find((c) => c.id === id)?.name; return name && name !== INTERNAL_CLIENT ? name : undefined; };
  const clientName = selected ? clientOf(selected.clientId) : undefined;
  // Template review: suggested by document content, switchable; "pravila" keeps the firm's rule checks.
  const chunks = selected ? db.chunks.filter((c) => c.documentId === selected.id) : [];
  const templates = allTemplates(db.settings?.reviewTemplates);
  const suggested = selected ? suggestTemplate(chunks.map((c) => c.text).join("\n"), templates) : undefined;
  const templateId = predlozak === "pravila" ? "pravila" : templates.some((t) => t.id === predlozak) ? predlozak : suggested?.id ?? "pravila";
  const template = templates.find((t) => t.id === templateId);
  const topics: TopicView[] = template ? evaluateTemplate(template, chunks).map((r) => ({
    id: r.topic.id, title: r.topic.title, question: r.topic.question, importance: r.topic.importance, recommendation: r.topic.recommendation, basis: r.topic.basis,
    status: r.status, criteria: r.criteria.map((c) => ({ label: c.label, found: c.found, quote: c.quote, heading: c.heading })),
  })) : [];
  const missing = topics.filter((t) => t.status !== "obuhvaceno").length;

  return (
    <>
      <PageHeader
        title="Provjera ugovora"
        subtitle="Provjera prema predlošcima za vrstu ugovora i pravilima ureda — svaki nalaz navodi odlomak i pravni temelj"
        crumbs={selected ? [{ href: "/provjera", label: "Provjera ugovora" }, { label: selected.title }] : undefined}
      >
        {session.user.role === "firm_admin" && hasFeature(session.firm, "source_settings") && <SourcesDropdown {...firmSources(db)} />}
        <Link className="btn btn-secondary btn-md" href="/provjera/predlosci">Predlošci</Link>
        <UploadButton contract>Novi ugovor</UploadButton>
      </PageHeader>
      <div className="content">
        <ScopeNotice scope={scope} />
        {docs.length === 0 ? <div className="card"><EmptyState icon={<IShield />} title="Još nema ugovora za provjeru" action={<UploadButton contract>Učitaj ugovor</UploadButton>}>
          Provjera ispituje rok plaćanja, automatsko produljenje, ograničenje odgovornosti, GDPR, raskid, ugovornu kaznu, nadležnost i oblik izmjena.
        </EmptyState></div> : <div className="review-layout">
          <aside className={`card card-pad${selected ? " has-selection" : ""}`} aria-label="Odabir ugovora">
            <ReviewDocumentSelector documents={docs.map((d) => ({ id: d.id, title: d.title, sub: [d.type, clientOf(d.clientId)].filter(Boolean).join(" · ") }))} selected={selected?.id} />
          </aside>

          {!selected ? <div className="card"><EmptyState icon={<IShield />} title="Odaberite ugovor">
            Pregled ispituje rok plaćanja, automatsko produljenje, ograničenje odgovornosti, GDPR, raskid, ugovornu kaznu, nadležnost i oblik izmjena.
          </EmptyState></div> : <div>
            <section className="card review-summary" aria-labelledby="review-title">
              <div>
                <h2 id="review-title">{template
                  ? missing ? `${missing} od ${topics.length} tema traži dopunu` : "Sve teme predloška su obuhvaćene"
                  : risky.length ? `${risky.length} ${risky.length === 1 ? "nalaz traži" : risky.length < 5 ? "nalaza traže" : "nalaza traži"} pažnju` : "Nema rizičnih nalaza"}</h2>
                <p className="t-sub">{clientName ? `${clientName} · ` : ""}{template ? `Predložak „${template.name}” · provjera prema kriterijima, bez AI obrade` : "Provjera prema pravilima ureda, bez AI obrade"} · svaki nalaz zahtijeva stručnu provjeru</p>
              </div>
              <div className="page-actions">
                <Link className="btn btn-secondary btn-md" href={`/provjera/izvjestaj?dok=${selected.id}&predlozak=${templateId}`}>Izvještaj (PDF)</Link>
                {hasFeature(session.firm, "documents") && <Link className="btn btn-secondary btn-md" href={`/dokumenti/${selected.id}`}>Otvori dokument<IArrowRight aria-hidden="true" /></Link>}
              </div>
            </section>

            <nav className="template-switch" aria-label="Predložak provjere">
              <span className="t-sub">Predložak:</span>
              {templates.map((t) => <Link key={t.id} className={`chip${templateId === t.id ? " selected" : ""}`} aria-current={templateId === t.id ? "page" : undefined} href={listHref("/provjera", { dok, predlozak: t.id })} scroll={false} title={t.description}>{t.name}{!t.builtIn && <span className="count">ured</span>}{suggested?.id === t.id && <span className="count">preporučeno</span>}</Link>)}
              <Link className={`chip${templateId === "pravila" ? " selected" : ""}`} aria-current={templateId === "pravila" ? "page" : undefined} href={listHref("/provjera", { dok, predlozak: "pravila" })} scroll={false} title="Osam pravila ureda: rok plaćanja, produljenje, odgovornost, GDPR, raskid, ugovorna kazna, nadležnost, izmjene">Pravila ureda</Link>
            </nav>

            {template ? <TemplateReview key={`${selected.id}-${template.id}`} documentId={selected.id} templateId={template.id} topics={topics} initialDecisions={selected.reviewDecisions ?? {}} /> : <>
            <nav className="risk-bar" aria-label="Filtriraj nalaze po riziku">
              <Link className="risk-seg" aria-current={!rizik ? "page" : undefined} href={listHref("/provjera", { dok, predlozak: "pravila" })} scroll={false}><b>{findings.length}</b>Svi</Link>
              {SEVERITIES.map((s) => {
                const n = findings.filter((f) => f.severity === s).length;
                return <Link key={s} className={`risk-seg ${s}`} aria-current={rizik === s ? "page" : undefined} href={listHref("/provjera", { dok, predlozak: "pravila", rizik: s })} scroll={false}><span className="dot" aria-hidden="true" /><b>{n}</b>{SEV_LABEL[s]}</Link>;
              })}
            </nav>

            <div className="card section-gap">
              {visible.length === 0 && <EmptyState icon={<ICheck />} title="Nema nalaza u ovom prikazu">To nije potvrda pravne ispravnosti ugovora.</EmptyState>}
              {visible.map((f, i) => {
                const Icon = SEV_ICON[f.severity];
                return <article key={i} className="finding">
                  <span className={`finding-icon ${f.severity}`} aria-hidden="true"><Icon /></span>
                  <div className="body">
                    <div className="badges"><h3 className="f-title">{f.title}</h3><span className={`badge ${SEV_BADGE[f.severity]}`}>{SEV_LABEL[f.severity]}</span></div>
                    <p className="f-detail">{f.detail}</p>
                    {f.preporuka && <p className="meta-line"><b>Preporuka:</b> {f.preporuka}</p>}
                    {(f.citat || f.temelj) && <details>
                      <summary><IChevronRight aria-hidden="true" />Odredba i pravni temelj</summary>
                      {f.citat && <div className="clause-ref"><div className="ref-head">Iz dokumenta</div>„…{f.citat}…”</div>}
                      {f.temelj && <p className="meta-line"><b>Temelj:</b> {f.temelj}</p>}
                    </details>}
                  </div>
                </article>;
              })}
            </div>
            </>}
          </div>}
        </div>}
      </div>
    </>
  );
}
