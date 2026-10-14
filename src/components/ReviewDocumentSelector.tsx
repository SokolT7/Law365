"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fold } from "@/components/shell/CommandPalette";
import { ISearch } from "@/components/Icons";

/** Searchable list of contracts; choosing one opens its review straight away. */
export default function ReviewDocumentSelector({ documents, selected }: { documents: { id: string; title: string; sub?: string }[]; selected?: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const matches = useMemo(() => documents.filter((doc) => !query || fold(`${doc.title} ${doc.sub ?? ""}`).includes(fold(query))).slice(0, 8), [documents, query]);
  return <div className="review-picker">
    <label className="search-field"><ISearch aria-hidden="true" /><span className="sr-only">Pronađite ugovor</span>
      <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Pronađite ugovor po nazivu…" aria-controls="review-picker-list" />
    </label>
    <ul id="review-picker-list" className="picker-list" aria-label="Dokumenti">
      {matches.map((doc) => <li key={doc.id}>
        <button type="button" className={`picker-item${doc.id === selected ? " active" : ""}`} aria-current={doc.id === selected ? "true" : undefined} onClick={() => router.push(`/provjera?dok=${doc.id}`)}>
          <span className="t-title">{doc.title}</span>{doc.sub && <span className="t-sub">{doc.sub}</span>}
        </button>
      </li>)}
      {!matches.length && <li className="t-sub picker-empty">Nema dokumenata za „{query}”.</li>}
    </ul>
  </div>;
}
