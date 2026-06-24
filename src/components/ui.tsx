import type { Severity, FindingStatus } from "@/lib/types";
import { SEVERITY_LABEL, STATUS_LABEL } from "@/lib/format";
import { ILock, ISpark } from "@/components/Icons";

export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="topbar">
      <div>
        <h1>{title}</h1>
        {subtitle && <div className="sub">{subtitle}</div>}
      </div>
      {children && <div className="flex">{children}</div>}
    </div>
  );
}

export function TenantBanner() {
  return (
    <div className="banner">
      <ILock size={16} />
      <span>
        <b>Radi unutar vašeg sustava.</b> Podaci ne napuštaju ured · AI se ne trenira na vašim
        podacima · svaki odgovor ima naveden izvor.
      </span>
    </div>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return <span className={`badge ${severity}`}>{SEVERITY_LABEL[severity]}</span>;
}

export function StatusBadge({ status }: { status: FindingStatus }) {
  return <span className={`badge ${status}`}>{STATUS_LABEL[status]}</span>;
}

export function AiNote({ label = "Generirao AI — provjerite" }: { label?: string }) {
  return (
    <span className="ai-note">
      <ISpark size={12} /> {label}
    </span>
  );
}

export function RiskChart({
  counts,
}: {
  counts: { visoka: number; srednja: number; niska: number };
}) {
  const rows: { key: Severity; label: string; cls: string }[] = [
    { key: "visoka", label: "Visok rizik", cls: "hi" },
    { key: "srednja", label: "Srednji rizik", cls: "mid" },
    { key: "niska", label: "Nizak rizik", cls: "lo" },
  ];
  const max = Math.max(1, counts.visoka, counts.srednja, counts.niska);
  const color: Record<string, string> = {
    hi: "var(--hi-fg)",
    mid: "var(--mid-fg)",
    lo: "var(--lo-fg)",
  };
  const bg: Record<string, string> = {
    hi: "var(--hi-bg)",
    mid: "var(--mid-bg)",
    lo: "var(--lo-bg)",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rows.map((r) => {
        const v = counts[r.key];
        return (
          <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 92, fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>
              {r.label}
            </div>
            <div style={{ flex: 1, background: bg[r.cls], borderRadius: 6, height: 22 }}>
              <div
                style={{
                  width: `${(v / max) * 100}%`,
                  minWidth: v > 0 ? 8 : 0,
                  background: color[r.cls],
                  height: "100%",
                  borderRadius: 6,
                  transition: "width .4s",
                }}
              />
            </div>
            <div className="mono" style={{ width: 28, textAlign: "right", fontWeight: 700, color: "var(--navy)" }}>
              {v}
            </div>
          </div>
        );
      })}
    </div>
  );
}
