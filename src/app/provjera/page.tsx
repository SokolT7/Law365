import Link from "next/link";
import { readDB } from "@/lib/db";
import { PageHeader, TenantBanner } from "@/components/ui";
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
  searchParams: Promise<{ dok?: string }>;
}) {
  const { dok } = await searchParams;
  const db = await readDB();
  const docs = [...db.documents].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  const selected = dok ? docs.find((d) => d.id === dok) : undefined;
  const findings = selected ? reviewDocument(db, selected) : [];
  const risky = findings.filter((f) => f.severity !== "ok");
  const clientName = selected
    ? db.clients.find((c) => c.id === selected.clientId)?.name
    : undefined;

  return (
    <>
      <PageHeader
        title="Provjera ugovora"
        subtitle="Trenutačni pregled rizika prema standardima ureda — svaki nalaz navodi odredbu i pravni temelj"
      />
      <div className="content">
        <TenantBanner />

        <div className="card card-pad" style={{ marginBottom: 18 }}>
          <div className="seg-label">Odaberite dokument za provjeru</div>
          <div className="flex wrap" style={{ gap: 8, marginTop: 8 }}>
            {docs.length === 0 && (
              <span className="muted" style={{ fontSize: 13 }}>
                Nema dokumenata — <Link href="/dokumenti" className="t-title">učitajte prvi →</Link>
              </span>
            )}
            {docs.map((d) => (
              <Link
                key={d.id}
                href={`/provjera?dok=${d.id}`}
                className={`tab${selected?.id === d.id ? " active" : ""}`}
              >
                {d.title}
              </Link>
            ))}
          </div>
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
                  Deterministički pregled prema standardima ureda. Nalaze provjerava odvjetnik —
                  za dubinsku AI analizu pokrenite <Link href={`/dokumenti/${selected.id}`} className="t-title">Detaljnu analizu →</Link>
                </p>
              </div>
              <div className="flex" style={{ gap: 8 }}>
                {(["visoka", "srednja", "niska"] as const).map((s) => {
                  const n = findings.filter((f) => f.severity === s).length;
                  return (
                    <span key={s} className={`badge ${s}`} style={{ fontSize: 12 }}>
                      {n} {SEV_LABEL[s].toLowerCase()}
                    </span>
                  );
                })}
              </div>
            </div>

            <div className="card" style={{ marginTop: 18 }}>
              <div className="card-head">
                <h3>Nalazi pregleda</h3>
                <span className="muted">{findings.length} ukupno</span>
              </div>
              {findings.length === 0 && (
                <div className="empty">Pregled nije pronašao rizike u ovom dokumentu.</div>
              )}
              {findings.map((f, i) => (
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
