import { readDB } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import { PageHeader, TenantBanner } from "@/components/ui";
import { ISpark, ICheck, IUpload, IX, ISearch } from "@/components/Icons";

export const dynamic = "force-dynamic";

function actionIcon(action: string) {
  if (action.includes("Učitao")) return <IUpload size={15} />;
  if (action.includes("Odobrio")) return <ICheck size={15} />;
  if (action.includes("Odbacio")) return <IX size={15} />;
  if (action.includes("pitanje")) return <ISearch size={15} />;
  return <ISpark size={15} />;
}

export default function AuditPage() {
  const db = readDB();
  const events = [...db.audit].sort((a, b) => +new Date(b.ts) - +new Date(a.ts));

  return (
    <>
      <PageHeader
        title="Zapisnik aktivnosti"
        subtitle="Nepromjenjivi revizijski trag svake radnje u sustavu"
      />
      <div className="content">
        <TenantBanner />
        <div className="card">
          <div className="card-head">
            <h3>Aktivnosti</h3>
            <span className="muted">{events.length} zapisa</span>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: 40 }}></th>
                <th>Radnja</th>
                <th>Predmet</th>
                <th>Korisnik</th>
                <th className="right">Vrijeme</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td style={{ color: "var(--gold)" }}>{actionIcon(e.action)}</td>
                  <td className="t-title">{e.action}</td>
                  <td className="t-sub">{e.target}</td>
                  <td className="t-sub">{e.actor}</td>
                  <td className="right mono t-sub">{formatDateTime(e.ts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
