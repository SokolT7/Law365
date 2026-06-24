import Link from "next/link";
import { readDB } from "@/lib/db";
import { PageHeader, SeverityBadge, TenantBanner } from "@/components/ui";
import FindingActions from "@/components/FindingActions";
import type { Severity } from "@/lib/types";

export const dynamic = "force-dynamic";

const ORDER: Record<Severity, number> = { visoka: 0, srednja: 1, niska: 2 };
const STATUS_ORDER: Record<string, number> = { otvoren: 0, odobren: 1, odbacen: 2 };

export default function ReviewPage() {
  const db = readDB();
  const findings = [...db.findings].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      ORDER[a.severity] - ORDER[b.severity]
  );
  const open = findings.filter((f) => f.status === "otvoren");
  const docTitle = (id: string) => db.documents.find((d) => d.id === id)?.title ?? "—";
  const chunkById = (cid?: string) => (cid ? db.chunks.find((c) => c.id === cid) : undefined);

  return (
    <>
      <PageHeader
        title="Provjera ugovora"
        subtitle="Nalazi rizika prema standardima ureda — odobrite ili odbacite uz revizijski trag"
      />
      <div className="content">
        <TenantBanner />

        <div className="grid grid-3" style={{ marginBottom: 18 }}>
          <Mini label="Otvoreno za pregled" value={open.length} />
          <Mini label="Visok rizik (otvoreno)" value={open.filter((f) => f.severity === "visoka").length} hi />
          <Mini label="Riješeno" value={findings.length - open.length} />
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Nalazi</h3>
            <span className="muted">{findings.length} ukupno</span>
          </div>
          {findings.map((f) => {
            const ch = chunkById(f.chunkId);
            return (
              <div key={f.id} className="finding">
                <SeverityBadge severity={f.severity} />
                <div className="body">
                  <div className="flex between">
                    <div className="f-title">{f.title}</div>
                    <Link href={`/dokumenti/${f.documentId}`} className="chip">
                      {docTitle(f.documentId)}
                    </Link>
                  </div>
                  <div className="f-detail">{f.detail}</div>
                  {ch && (
                    <div className="clause-ref">
                      <div className="ref-head">{ch.heading}</div>
                      {ch.text.replace(/\s+/g, " ").slice(0, 200)}…
                    </div>
                  )}
                </div>
                <div style={{ flex: "none" }}>
                  <FindingActions findingId={f.id} status={f.status} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

function Mini({ label, value, hi }: { label: string; value: number; hi?: boolean }) {
  return (
    <div className="stat">
      <span className="label">{label}</span>
      <div className={`value${hi ? " hi" : ""}`}>{value}</div>
    </div>
  );
}
