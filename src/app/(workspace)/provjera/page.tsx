import Link from "next/link";
import ReviewDocumentSelector from "@/components/ReviewDocumentSelector";
import { queryValue, listHref, type ListParams } from "@/lib/list-query";
import { readWorkspaceDB as readDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { hasFeature } from "@/lib/features";
import { PageHeader, TenantBanner } from "@/components/ui";
import UploadCard from "@/components/UploadCard";
import SourcesDropdown from "@/components/SourcesDropdown";
import { defaultSources } from "@/lib/sources";
import { reviewDocument } from "@/lib/review";
import { IShield, ICheck, IAlert } from "@/components/Icons";

export const dynamic = "force-dynamic";

const SEV_LABEL: Record<string, string> = {
  visoka: "Visoki rizik",
  srednja: "Srednji rizik",
  niska: "Napomena",
  ok: "Uredno",
};

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<ListParams>;
}) {
  const params = await searchParams;
  const dok = queryValue(params, "dok"), rizik = queryValue(params, "rizik");
  const session = await workspaceSession("contract_review");
  const db = await readDB();
  const docs = [...db.documents].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const selected = dok ? docs.find((d) => d.id === dok) : undefined;
  const order = { visoka: 0, srednja: 1, niska: 2, ok: 3 };
  const findings = selected ? reviewDocument(db, selected).sort((a,b) => order[a.severity] - order[b.severity]) : [];
  const visible = findings.filter(f => !rizik || f.severity === rizik);
  const risky = findings.filter((f) => f.severity !== "ok");
  const clientName = selected
    ? db.clients.find((c) => c.id === selected.clientId)?.name
    : undefined;

  return (
    <>
      <PageHeader
        title="Provjera ugovora"
        subtitle="Trenutačni pregled rizika prema standardima ureda — svaki nalaz navodi odredbu i pravni temelj"
      >
        {session.user.role === "firm_admin" && hasFeature(session.firm, "source_settings") && <SourcesDropdown sources={db.settings?.sources ?? defaultSources()} />}
      </PageHeader>
      <div className="content">
        <TenantBanner />

        <div className="split-330" style={{ marginBottom: 18 }}>
          <div className="card card-pad">
            <ReviewDocumentSelector documents={docs.map(d => ({id:d.id, title:d.title}))} selected={selected?.id} />
          </div>
          <UploadCard
            heading="Nova provjera — učitaj ugovor"
            kind="ugovor"
            redirect="provjera"
            clients={db.clients
              .filter((c) => c.name !== "Ručno učitani dokument")
              .map((c) => ({ id: c.id, name: c.name }))}
          />
        </div>

        {!selected && docs.length > 0 && (
          <div className="card card-pad" style={{ textAlign: "center", padding: "48px 24px" }}>
            <IShield size={28} color="var(--gold)" />
            <p style={{ fontWeight: 700, color: "var(--navy)", margin: "12px 0 4px", fontSize: 15 }}>
              Odaberite dokument
            </p>
            <p className="muted" style={{ fontSize: 13, maxWidth: 460, margin: "0 auto" }}>
              Pregled provjerava rok plaćanja, automatsko produljenje, ograničenje odgovornosti,
              GDPR odredbe, raskid, ugovornu kaznu, nadležnost i oblik izmjena.
            </p>
          </div>
        )}

        {selected && (
          <>
            <div className="izvori-intro" style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div className="ii-count">
                  <b>{risky.length}</b> {risky.length === 1 ? "nalaz" : "nalaza"} · {selected.title}
                </div>
                <p className="ii-text">
                  {clientName && clientName !== "Ručno učitani dokument" ? `Klijent: ${clientName} · ` : ""}
                  Automatska provjera prema pravilima, bez AI obrade. Svaki nalaz zahtijeva stručnu provjeru.
                  {hasFeature(session.firm,"detailed_analysis") && <>Za dubinsku AI analizu otvorite <Link href={`/dokumenti/${selected.id}`} className="t-title">radni prostor →</Link></>}
                </p>
              </div>
              <nav className="severity-filters" aria-label="Filtriraj nalaze po riziku">
                <Link className={`chip${!rizik ? " selected" : ""}`} aria-current={!rizik ? "page" : undefined} href={listHref("/provjera", {dok})}>Svi ({findings.length})</Link>
                {(["visoka", "srednja", "niska", "ok"] as const).map((s) => {
                  const n = findings.filter((f) => f.severity === s).length;
                  return (
                    <Link key={s} className={`chip${rizik === s ? " selected" : ""}`} aria-current={rizik === s ? "page" : undefined} href={listHref("/provjera", {dok, rizik:s})}>{SEV_LABEL[s]} ({n})</Link>
                  );
                })}
              </nav>
            </div>

            <div className="card" style={{ marginTop: 18 }}>
              <div className="card-head">
                <h3>Nalazi pregleda</h3>
                <span className="muted">{visible.length} / {findings.length} nalaza</span>
              </div>
              {visible.length === 0 && (
                <div className="empty">Nema nalaza u odabranom prikazu. To nije potvrda pravne ispravnosti ugovora.</div>
              )}
              {visible.map((f, i) => (
                <div key={i} className="finding">
                  <span style={{ flex: "none", marginTop: 2, color: f.severity === "ok" ? "var(--lo-fg)" : f.severity === "visoka" ? "var(--hi-fg)" : "var(--mid-fg)" }}>
                    {f.severity === "ok" ? <ICheck size={17} /> : <IAlert size={17} />}
                  </span>
                  <div className="body">
                    <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
                      <span className="f-title">{f.title}</span>
                      <span className={`badge ${f.severity === "ok" ? "odobren" : f.severity}`} style={{ fontSize: 10.5 }}>
                        {SEV_LABEL[f.severity]}
                      </span>
                    </div>
                    <div className="f-detail">{f.detail}</div>
                    {f.citat && (
                      <div className="clause-ref">
                        <div className="ref-head">Iz dokumenta</div>
                        „…{f.citat}…”
                      </div>
                    )}
                    {f.temelj && (
                      <div className="t-sub" style={{ marginTop: 8 }}>
                        <b style={{ color: "var(--navy)" }}>Temelj:</b> {f.temelj}
                      </div>
                    )}
                    {f.preporuka && (
                      <div className="t-sub" style={{ marginTop: 4 }}>
                        <b style={{ color: "var(--gold)" }}>Preporuka:</b> {f.preporuka}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
