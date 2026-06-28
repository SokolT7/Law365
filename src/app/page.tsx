import Link from "next/link";
import { readDB } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, TenantBanner, StatusChart, DocStatusBadge } from "@/components/ui";
import ResetButton from "@/components/ResetButton";
import { IClock, IDocs, ISpark, IShield } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const db = await readDB();
  const docs = db.documents;
  const counts = {
    u_obradi: docs.filter((d) => d.status === "u_obradi").length,
    analizirano: docs.filter((d) => d.status === "analizirano").length,
    greska: docs.filter((d) => d.status === "greska").length,
  };

  const deadlines = docs
    .flatMap((d) =>
      (d.result?.datumiIRokovi ?? [])
        .filter((x) => x.datum)
        .map((x) => ({ docId: d.id, docTitle: d.title, opis: x.opis, datum: x.datum! }))
    )
    .sort((a, b) => +new Date(a.datum) - +new Date(b.datum));

  const recent = [...docs]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6);

  return (
    <>
      <PageHeader title="Nadzorna ploča" subtitle="Pregled dokumenata, statusa analize i rokova">
        <ResetButton />
      </PageHeader>
      <div className="content">
        <TenantBanner />

        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <Stat label="Dokumenti" value={docs.length} foot="ukupno" Icon={IDocs} />
          <Stat label="U obradi" value={counts.u_obradi} foot="analiza u tijeku" Icon={ISpark} />
          <Stat label="Analizirano" value={counts.analizirano} foot="spremno za pregled" Icon={IShield} />
          <Stat label="Rokovi" value={deadlines.length} foot="izdvojeni datumi" Icon={IClock} />
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div className="card-head">
              <h3>Dokumenti po statusu</h3>
            </div>
            <div className="card-pad">
              <StatusChart counts={counts} />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Nadolazeći datumi i rokovi</h3>
              <span className="muted">{deadlines.length}</span>
            </div>
            <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {deadlines.length === 0 && <div className="empty">Nema izdvojenih datuma.</div>}
              {deadlines.slice(0, 5).map((x, i) => (
                <div key={i} className="flex between" style={{ alignItems: "flex-start", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <Link href={`/dokumenti/${x.docId}`} style={{ fontWeight: 600, color: "var(--navy)" }}>
                      {x.docTitle}
                    </Link>
                    <div className="t-sub" style={{ marginTop: 2 }}>{x.opis}</div>
                  </div>
                  <span className="chip mono">{formatDate(x.datum)}</span>
                </div>
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
                  <td><DocStatusBadge status={d.status} /></td>
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
}: {
  label: string;
  value: number;
  foot: string;
  Icon: (p: { size?: number; color?: string }) => React.ReactElement;
}) {
  return (
    <div className="stat">
      <div className="flex between">
        <span className="label">{label}</span>
        <Icon size={18} color="var(--muted)" />
      </div>
      <div className="value">{value}</div>
      <div className="foot">{foot}</div>
    </div>
  );
}
