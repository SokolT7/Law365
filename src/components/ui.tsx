import type { DocStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/format";
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
        <b>Radi unutar vašeg sustava.</b> Obradu pokreće vaš n8n · Claude se ne trenira na vašim
        podacima · svaka stavka ima naveden izvor.
      </span>
    </div>
  );
}

const STATUS_CLASS: Record<DocStatus, string> = {
  u_obradi: "srednja",
  analizirano: "niska",
  greska: "visoka",
};

export function DocStatusBadge({ status }: { status: DocStatus }) {
  return <span className={`badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function AiNote({ label = "Generirao Claude — provjerite" }: { label?: string }) {
  return (
    <span className="ai-note">
      <ISpark size={12} /> {label}
    </span>
  );
}

export function StatusChart({
  counts,
}: {
  counts: { u_obradi: number; analizirano: number; greska: number };
}) {
  const rows: { key: DocStatus; label: string; color: string; bg: string }[] = [
    { key: "analizirano", label: "Analizirano", color: "var(--lo-fg)", bg: "var(--lo-bg)" },
    { key: "u_obradi", label: "U obradi", color: "var(--mid-fg)", bg: "var(--mid-bg)" },
    { key: "greska", label: "Greška", color: "var(--hi-fg)", bg: "var(--hi-bg)" },
  ];
  const max = Math.max(1, counts.u_obradi, counts.analizirano, counts.greska);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rows.map((r) => {
        const v = counts[r.key];
        return (
          <div key={r.key} style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 92, fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>
              {r.label}
            </div>
            <div style={{ flex: 1, background: r.bg, borderRadius: 6, height: 22 }}>
              <div
                style={{
                  width: `${(v / max) * 100}%`,
                  minWidth: v > 0 ? 8 : 0,
                  background: r.color,
                  height: "100%",
                  borderRadius: 6,
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
