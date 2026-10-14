import Link from "next/link";
import { listHref } from "@/lib/list-query";
import { IArrowLeft, IArrowRight } from "@/components/Icons";

export default function Pagination({ path, filters, page, pages, total, start, end }: {
  path: string; filters: Record<string, string>; page: number; pages: number; total: number; start: number; end: number;
}) {
  if (pages <= 1) return null;
  const prev = <><IArrowLeft aria-hidden="true" />Prethodna</>;
  const next = <>Sljedeća<IArrowRight aria-hidden="true" /></>;
  return <nav className="register-pagination" aria-label="Stranice rezultata">
    <span className="t-sub" role="status">{start}–{end} od {total}</span>
    <div className="pagination-controls">
      {page > 1 ? <Link className="btn btn-secondary btn-sm" href={listHref(path, { ...filters, stranica: page - 1 })} scroll={false}>{prev}</Link> : <span className="btn btn-secondary btn-sm" aria-disabled="true">{prev}</span>}
      <span className="t-sub mono">{page} / {pages}</span>
      {page < pages ? <Link className="btn btn-secondary btn-sm" href={listHref(path, { ...filters, stranica: page + 1 })} scroll={false}>{next}</Link> : <span className="btn btn-secondary btn-sm" aria-disabled="true">{next}</span>}
    </div>
  </nav>;
}
