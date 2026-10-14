import { FEATURE_CATALOG } from "@/lib/features";

type AuditEntry = { id: string; actorName: string; action: string; targetType: string; targetId: string; createdAt: string; before?: unknown; after?: unknown };

const ACTIONS: Record<string, string> = {
  "firm.created": "Ured je kreiran", "firm.updated": "Postavke ureda su promijenjene", "user.created": "Korisnik je dodan", "user.updated": "Korisnički račun je promijenjen", "user.invited": "Pozivnica je kreirana", "invitation.created": "Pozivnica je kreirana", "invitation.accepted": "Pozivnica je prihvaćena", "invitation.revoked": "Pozivnica je opozvana", "user.login": "Prijava u sustav", "admin.bootstrap": "Administrator je postavljen",
};

const FIELDS: Record<string, string> = { name: "Naziv / ime", legalName: "Pravni naziv", email: "E-adresa", role: "Uloga", status: "Status", accent: "Akcentna boja", greeting: "Pozdrav", features: "Dostupne funkcije" };
const VALUES: Record<string, string> = { draft: "U pripremi", active: "Aktivan", suspended: "Suspendiran", disabled: "Onemogućen", invited: "Pozvan", member: "Član ureda", firm_admin: "Administrator ureda", platform_admin: "LTB administrator" };

function valueLabel(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (Array.isArray(value)) return value.map((key) => FEATURE_CATALOG.find((feature) => feature.key === key)?.label || String(key)).join(", ") || "Nijedna";
  return VALUES[String(value)] || String(value);
}

function changedFields(entry: AuditEntry) {
  const before = entry.before && typeof entry.before === "object" ? entry.before as Record<string, unknown> : {};
  const after = entry.after && typeof entry.after === "object" ? entry.after as Record<string, unknown> : {};
  return Object.entries(FIELDS).filter(([key]) => JSON.stringify(before[key]) !== JSON.stringify(after[key])).map(([key, label]) => ({ key, label, before: valueLabel(before[key]), after: valueLabel(after[key]) }));
}

export default function AuditList({ entries }: { entries: AuditEntry[] }) {
  if (!entries.length) return <div className="admin-empty"><h3>Još nema aktivnosti.</h3><p>Ovdje će se bilježiti promjene ureda, korisničkih računa i pristupa.</p></div>;
  return <ol className="admin-audit-list">{entries.map((entry) => { const changes = changedFields(entry); return <li key={entry.id}><div><strong>{ACTIONS[entry.action] || entry.action}</strong><p>{entry.actorName} <span aria-hidden="true">·</span> {entry.targetType === "firm" ? "Ured" : entry.targetType === "user" ? "Korisnik" : "Sustav"}</p>{changes.length > 0 && <details className="admin-audit-detail"><summary>Prikaži promjene ({changes.length})</summary><dl>{changes.map((change) => <div key={change.key}><dt>{change.label}</dt><dd><span>{change.before}</span><span aria-hidden="true"> → </span><strong>{change.after}</strong></dd></div>)}</dl></details>}</div><time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString("hr-HR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Zagreb" })}<small>Zagreb</small></time></li>; })}</ol>;
}
