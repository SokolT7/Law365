import Link from "next/link";
import { readDB } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, TenantBanner, RiskChart } from "@/components/ui";
import ResetButton from "@/components/ResetButton";
import { IAlert, IClock, IDocs, IShield } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const db = readDB();
  const open = db.findings.filter((f) => f.status === "otvoren");
  const counts = {
    visoka: open.filter((f) => f.severity === "visoka").length,
    srednja: open.filter((f) => f.severity === "srednja").length,
    niska: open.filter((f) => f.severity === "niska").length,
  };
  const withDates = db.obligations
    .filter((o) => o.dueDate)
    .sort((a, b) => +new Date(a.dueDate!) - +new Date(b.dueDate!));
  const recent = [...db.documents]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 5);
  const docTitle = (id: string) => db.documents.find((d) => d.id === id)?.title ?? "—";

  return (
    <>
      <PageHeader title="Nadzorna ploča" subtitle="Pregled rizika, rokova i dokumenata ureda">
        <ResetButton />
      </PageHeader>
      <div className="content">
        <TenantBanner />

        <div className="grid grid-4" style={{ marginBottom: 18 }}>
          <Stat label="Dokumenti" value={db.documents.length} foot="ukupno analizirano" Icon={IDocs} />
          <Stat label="Otvoreni nalazi" value={open.length} foot="čeka pregled" Icon={IShield} />
          <Stat
            label="Visok rizik"
            value={counts.visoka}
            foot="prioritetno"
            Icon={IAlert}
            hi
          />
          <Stat label="Rokovi" value={withDates.length} foot="praćeni rokovi" Icon={IClock} />
        </div>

        <div className="grid grid-2">
          <div className="card">
            <div className="card-head">
              <h3>Izloženost riziku</h3>
              <span className="muted">otvoreni nalazi po ozbiljnosti</span>
            </div>
            <div className="card-pad">
              <RiskChart counts={counts} />
            </div>
          </div>

          <div className="card">
            <div className="card-head">
              <h3>Nadolazeći rokovi i obnove</h3>
              <span className="muted">{withDates.length}</span>
            </div>
            <div className="card-pad" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {withDates.length === 0 && <div className="empty">Nema praćenih rokova.</div>}
              {withDates.slice(0, 5).map((o) => (
                <div key={o.id} className="flex between" style={{ alignItems: "flex-start" }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: "var(--navy)" }}>{docTitle(o.documentId)}</div>
                    <div className="t-sub" style={{ marginTop: 2 }}>{o.text.slice(0, 90)}…</div>
                  </div>
                  <span className="chip mono">{formatDate(o.dueDate)}</span>
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
                <th>Nalazi</th>
                <th className="right">Datum</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((d) => {
                const fc = db.findings.filter((f) => f.documentId === d.id);
                const hi = fc.filter((f) => f.severity === "visoka").length;
                return (
                  <tr key={d.id}>
                    <td>
                      <Link href={`/dokumenti/${d.id}`} className="t-title">{d.title}</Link>
                    </td>
                    <td className="t-sub">{d.type}</td>
                    <td>
                      <span className="chip">{fc.length} nalaza{hi ? ` · ${hi} visok` : ""}</span>
                    </td>
                    <td className="right mono t-sub">{formatDate(d.createdAt)}</td>
                  </tr>
                );
              })}
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
  hi,
}: {
  label: string;
  value: number;
  foot: string;
  Icon: (p: { size?: number; color?: string }) => React.ReactElement;
  hi?: boolean;
}) {
  return (
    <div className="stat">
      <div className="flex between">
        <span className="label">{label}</span>
        <Icon size={18} color="var(--muted)" />
      </div>
      <div className={`value${hi ? " hi" : ""}`}>{value}</div>
      <div className="foot">{foot}</div>
    </div>
  );
}
