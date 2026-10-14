import Link from "next/link";
import { listHref } from "@/lib/list-query";
export default function Pagination({ path, filters, page, pages, total, start, end }: {
  path: string; filters: Record<string, string>; page: number; pages: number; total: number; start: number; end: number;
}) {
  return <nav className="register-pagination" aria-label="Stranice rezultata">
    <span className="t-sub" role="status">{start}–{end} od {total} zapisa</span>
    {pages > 1 && <div className="pagination-controls">
      {page > 1 ? <Link className="btn btn-sm" href={listHref(path, { ...filters, stranica: page - 1 })}>← Prethodna</Link> : <span className="btn btn-sm" aria-disabled="true">← Prethodna</span>}
      <span className="t-sub">Stranica {page} / {pages}</span>
      {page < pages ? <Link className="btn btn-sm" href={listHref(path, { ...filters, stranica: page + 1 })}>Sljedeća →</Link> : <span className="btn btn-sm" aria-disabled="true">Sljedeća →</span>}
    </div>}
  </nav>;
}
