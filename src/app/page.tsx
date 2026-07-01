import Link from "next/link";
import { readDB } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, TenantBanner, StatusChart, DocStatusBadge } from "@/components/ui";
import ResetButton from "@/components/ResetButton";
import { overallStatus, primaryResult } from "@/lib/docs";
import { IDocs, ISpark, IShield, IUsers, IFlag } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const db = await readDB();
  const docs = db.documents;
  const counts = {
    analizirano: docs.filter((d) => d.analyses.some((a) => a.status === "analizirano")).length,
    u_obradi: docs.filter(
      (d) => d.analyses.some((a) => a.status === "u_obradi") && !d.analyses.some((a) => a.status === "analizirano")
    ).length,
    greska: docs.filter((d) => d.analyses.length > 0 && d.analyses.every((a) => a.status === "greska")).length,
  };

  const deadlines = docs
    .flatMap((d) => {
      const r = primaryResult(d);
      return r
        ? r.datumiIRokovi
            .filter((x) => x.datum)
            .map((x) => ({ docId: d.id, docTitle: d.title, opis: x.opis, datum: x.datum! }))
        : [];
    })
    .sort((a, b) => +new Date(a.datum) - +new Date(b.datum));

  const recent = [...docs]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6);

  const namedClients = db.clients.filter((c) => c.name !== "Ručno učitani dokument");
  const regs = [...(db.regUpdates ?? [])].sort((a, b) => +new Date(b.date) - +new Date(a.date));
  const newRegs = regs.filter((r) => !r.reviewed);

  return (
    <>
      <PageHeader title="Nadzorna ploča" subtitle="Pregled dokumenata, klijenata, rokova i propisa">
        <ResetButton />
      </PageHeader>
      <div className="content">
        <TenantBanner />

        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <Stat label="Dokumenti" value={docs.length} foot="ukupno" Icon={IDocs} href="/dokumenti" />
          <Stat label="Klijenti" value={namedClients.length} foot="aktivni klijenti" Icon={IUsers} href="/klijenti" />
          <Stat label="Analizirano" value={counts.analizirano} foot="spremno za pregled" Icon={IShield} href="/dokumenti" />
          <Stat label="Nove promjene propisa" value={newRegs.length} foot="čeka pregled" Icon={IFlag} href="/propisi" hi={newRegs.some((r) => r.severity === "visoka")} />
        </div>

        <div className="grid grid-3" style={{ alignItems: "start" }}>
          <div className="card">
            <div className="card-head">
              <h3>Dokumenti po statusu</h3>
              <span className="muted">{counts.u_obradi > 0 ? `${counts.u_obradi} u obradi` : ""}</span>
            </div>
            <div className="card-pad">
              <StatusChart counts={counts} />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Nadolazeći rokovi</h3>
              <span className="muted">{deadlines.length}</span>
            </div>
            <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {deadlines.length === 0 && <div className="empty">Nema izdvojenih datuma.</div>}
              {deadlines.slice(0, 4).map((x, i) => (
                <div key={i} className="flex between" style={{ alignItems: "flex-start", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/dokumenti/${x.docId}`} style={{ fontWeight: 600, color: "var(--navy)", fontSize: 13 }}>
                      {x.docTitle}
                    </Link>
                    <div className="t-sub" style={{ marginTop: 2 }}>{x.opis}</div>
                  </div>
                  <span className="chip mono" style={{ flex: "none" }}>{formatDate(x.datum)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Promjene propisa</h3>
              <Link href="/propisi" className="muted">Sve →</Link>
            </div>
            <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {newRegs.length === 0 && <div className="empty">Sve promjene su pregledane.</div>}
              {newRegs.slice(0, 3).map((r) => (
                <Link key={r.id} href="/propisi" className="reg-mini">
                  <span className={`tab-dot ${r.severity === "visoka" ? "hi" : r.severity === "srednja" ? "mid" : "lo"}`} style={{ marginTop: 6 }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ fontWeight: 600, color: "var(--navy)", fontSize: 13, display: "block" }}>
                      {r.title}
                    </span>
                    <span className="t-sub">{r.source.split("—")[0].trim()} · {formatDate(r.date)}</span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <div className="card-head">
            <h3>Najnoviji dokumenti</h3>
            <Link href="/dokumenti" className="muted">Svi dokumenti →</Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Dokument</th>
                <th>Vrsta</th>
                <th>Status</th>
                <th className="right">Datum</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((d) => (
                <tr key={d.id}>
                  <td>
                    <Link href={`/dokumenti/${d.id}`} className="t-title">{d.title}</Link>
                  </td>
                  <td className="t-sub">{d.type}</td>
                  <td>
                    {d.analyses.length === 0 ? (
                      <span className="badge neutral">Učitano</span>
                    ) : (
                      <DocStatusBadge status={overallStatus(d)} />
                    )}
                  </td>
                  <td className="right mono t-sub">{formatDate(d.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  foot,
  Icon,
  href,
  hi,
}: {
  label: string;
  value: number;
  foot: string;
  Icon: (p: { size?: number; color?: string }) => React.ReactElement;
  href?: string;
  hi?: boolean;
}) {
  const body = (
    <>
      <div className="flex between">
        <span className="label">{label}</span>
        <Icon size={18} color="var(--muted)" />
      </div>
      <div className={`value${hi ? " hi" : ""}`}>{value}</div>
      <div className="foot">{foot}</div>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="stat">
        {body}
      </Link>
    );
  }
  return <div className="stat">{body}</div>;
}
