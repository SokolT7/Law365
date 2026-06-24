const DATE = new Intl.DateTimeFormat("hr-HR", {
  day: "numeric",
  month: "long",
  year: "numeric",
});
const DATETIME = new Intl.DateTimeFormat("hr-HR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return DATE.format(d);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return DATETIME.format(d);
}

export const SEVERITY_LABEL: Record<string, string> = {
  visoka: "Visok rizik",
  srednja: "Srednji rizik",
  niska: "Nizak rizik",
};

export const STATUS_LABEL: Record<string, string> = {
  otvoren: "Otvoreno",
  odobren: "Odobreno",
  odbacen: "Odbačeno",
  analizirano: "Analizirano",
  u_obradi: "U obradi",
};
