import Link from "next/link";
import { readDB } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, TenantBanner } from "@/components/ui";
import RegReviewButton from "@/components/RegReviewButton";
import { IFlag } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function RegulatoryPage({
  searchParams,
}: {
  searchParams: Promise<{ prikaz?: string }>;
}) {
  const { prikaz } = await searchParams;
  const db = await readDB();
  const all = [...(db.regUpdates ?? [])].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const items = prikaz === "pregledano" ? all.filter((r) => r.reviewed) : prikaz === "novo" ? all.filter((r) => !r.reviewed) : all;
  const newCount = all.filter((r) => !r.reviewed).length;

  const clientName = (id: string) => db.clients.find((c) => c.id === id)?.name;

  return (
    <>
      <PageHeader
        title="Praćenje propisa"
        subtitle="Promjene zakona i regulative povezane s vašim klijentima i predmetima"
      />
      <div className="content">
        <TenantBanner />

        <div className="izvori-intro" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div className="ii-count"><b>{newCount}</b> / {all.length} novih promjena</div>
            <p className="ii-text">
              Sustav prati Narodne novine, EUR-Lex i regulatorna tijela te povezuje promjene s
              klijentima na koje se odnose. Svaka stavka nosi preporučenu radnju ureda.
            </p>
          </div>
          <div className="tabs" style={{ marginBottom: 0 }}>
            <Link href="/propisi" className={`tab${!prikaz ? " active" : ""}`}>Sve</Link>
            <Link href="/propisi?prikaz=novo" className={`tab${prikaz === "novo" ? " active" : ""}`}>Novo</Link>
            <Link href="/propisi?prikaz=pregledano" className={`tab${prikaz === "pregledano" ? " active" : ""}`}>Pregledano</Link>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="card card-pad empty">
            Nema stavki u ovom prikazu.
            {all.length === 0 && " Ako je baza starija, kliknite „Ponovno učitaj demo” na nadzornoj ploči."}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 18 }}>
            {items.map((r) => (
              <div key={r.id} className={`card card-pad reg-item${r.reviewed ? " reviewed" : ""}`}>
                <div className="flex between" style={{ alignItems: "flex-start", gap: 14 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="flex" style={{ gap: 8, flexWrap: "wrap" }}>
                      <span className={`badge ${r.severity}`}>
                        <IFlag size={11} /> {r.severity === "visoka" ? "Visoka važnost" : r.severity === "srednja" ? "Srednja važnost" : "Niska važnost"}
                      </span>
                      {r.reviewed && <span className="badge odobren">Pregledano</span>}
                      <span className="t-sub mono">{formatDate(r.date)}</span>
                    </div>
                    <h3 style={{ fontSize: 15.5, margin: "10px 0 4px" }}>{r.title}</h3>
                    <div className="t-sub" style={{ marginBottom: 8 }}>{r.source}</div>
                    <p style={{ margin: 0, fontSize: 13.5, color: "#33405c", lineHeight: 1.6, maxWidth: 760 }}>
                      {r.summary}
                    </p>
                    {r.action && (
                      <div className="clause-ref" style={{ maxWidth: 760 }}>
                        <div className="ref-head">Preporučena radnja</div>
                        {r.action}
                      </div>
                    )}
                    <div className="flex wrap" style={{ gap: 6, marginTop: 12 }}>
                      {r.areas.map((a) => (
                        <span key={a} className="chip" style={{ fontSize: 11.5 }}>{a}</span>
                      ))}
                      {r.affectedClientIds.map((cid) => {
                        const name = clientName(cid);
                        return name ? (
                          <Link key={cid} href={`/klijenti/${cid}`} className="chip" style={{ fontSize: 11.5, color: "var(--navy)" }}>
                            → {name}
                          </Link>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div style={{ flex: "none" }}>
                    <RegReviewButton id={r.id} reviewed={!!r.reviewed} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
