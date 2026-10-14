import Link from "next/link";
import type { DocStatus } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/format";
import { IBook, IChevronRight } from "@/components/Icons";
import SearchTrigger from "@/components/shell/SearchTrigger";
import NotificationBell from "@/components/shell/NotificationBell";

export type Crumb = { href?: string; label: string };

export function Breadcrumbs({ items, className = "crumbs" }: { items: Crumb[]; className?: string }) {
  return <nav className={className} aria-label="Putanja">
    {items.map((item, i) => <span key={`${item.label}-${i}`} className="contents">
      {i > 0 && <IChevronRight aria-hidden="true" />}
      {item.href ? <Link href={item.href}>{item.label}</Link> : <span aria-current="page">{item.label}</span>}
    </span>)}
  </nav>;
}

export function PageHeader({
  title,
  subtitle,
  crumbs,
  search = true,
  children,
}: {
  title: string;
  subtitle?: string;
  crumbs?: Crumb[];
  search?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="topbar-title">
        {crumbs && <Breadcrumbs items={crumbs} />}
        <h1>{title}</h1>
        {subtitle && <div className="sub">{subtitle}</div>}
      </div>
      <div className="page-actions">
        {search && <SearchTrigger />}
        {search && <NotificationBell />}
        {children}
      </div>
    </header>
  );
}

/** Firm identity is persistent in the shell; avoid repeating unverified data promises. */
export function TenantBanner() {
  return null;
}

const STATUS_CLASS: Record<DocStatus, string> = {
  u_obradi: "srednja processing",
  analizirano: "niska",
  greska: "visoka",
};

export function DocStatusBadge({ status }: { status: DocStatus }) {
  return <span className={`badge ${STATUS_CLASS[status]}`}>{STATUS_LABEL[status]}</span>;
}

export function AiNote({ label = "AI prijedlog · provjerite izvore" }: { label?: string }) {
  return (
    <span className="ai-note">
      <IBook size={12} aria-hidden="true" /> {label}
    </span>
  );
}

export function EmptyState({ icon, title, children, action }: { icon?: React.ReactNode; title: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return <div className="empty">
    {icon && <span className="empty-icon" aria-hidden="true">{icon}</span>}
    <h3>{title}</h3>
    {children && <p>{children}</p>}
    {action}
  </div>;
}

/** Relative time ("prije 2 h") with the absolute Zagreb timestamp as a tooltip. */
export function RelativeTime({ iso }: { iso: string }) {
  const date = new Date(iso);
  const absolute = new Intl.DateTimeFormat("hr-HR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Zagreb" }).format(date);
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  const rtf = new Intl.RelativeTimeFormat("hr-HR", { numeric: "auto" });
  const label = minutes < 1 ? "upravo" : minutes < 60 ? rtf.format(-minutes, "minute") : minutes < 1440 ? rtf.format(-Math.round(minutes / 60), "hour") : minutes < 10080 ? rtf.format(-Math.round(minutes / 1440), "day")
    : new Intl.DateTimeFormat("hr-HR", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Zagreb" }).format(date);
  return <time dateTime={iso} title={absolute}>{label}</time>;
}
