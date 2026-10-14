/** Shared URL state for private registers. No content is stored in the browser. */
export type ListParams = Record<string, string | string[] | undefined>;
export function queryValue(params: ListParams, key: string): string {
  const value = params[key];
  return typeof value === "string" ? value : "";
}
export function listHref(path: string, params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== "") search.set(key, String(value));
  return `${path}${search.size ? `?${search}` : ""}`;
}
export function paginate<T>(items: T[], value: string, size = 20) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const requested = /^\d+$/.test(value) ? Number(value) : 1;
  const page = Math.max(1, Math.min(pages, Number.isSafeInteger(requested) ? requested : 1));
  return { items: items.slice((page - 1) * size, page * size), page, pages, total: items.length, start: items.length ? (page - 1) * size + 1 : 0, end: Math.min(page * size, items.length) };
}
export function matchesQuery(query: string, ...values: (string | undefined)[]) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("hr");
  return normalize(values.filter(Boolean).join(" ")).includes(normalize(query.trim()));
}
