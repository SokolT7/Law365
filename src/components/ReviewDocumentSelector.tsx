"use client";
import { useState } from "react";
import { matchesQuery } from "@/lib/list-query";
export default function ReviewDocumentSelector({ documents, selected }: { documents: { id: string; title: string }[]; selected?: string }) {
  const [query, setQuery] = useState("");
  const [choice, setChoice] = useState(selected ?? "");
  const matches = documents.filter(doc => matchesQuery(query, doc.title));
  return <form action="/provjera" className="form-stack">
    <label className="field">Pronađite ugovor<input type="search" value={query} onChange={event => { setQuery(event.target.value); setChoice(""); }} placeholder="Pretražite naziv dokumenta…" /></label>
    <label className="field">Dokument<select name="dok" value={choice} required onChange={event => setChoice(event.target.value)}>
      <option value="" disabled>Odaberite dokument</option>
      {matches.map(doc => <option key={doc.id} value={doc.id}>{doc.title}</option>)}
    </select></label>
    <span className="t-sub" role="status">{matches.length ? `${matches.length} dostupnih dokumenata` : "Nema dokumenata koji odgovaraju pretrazi."}</span>
    <button className="btn btn-primary" disabled={!choice} type="submit">Otvori provjeru →</button>
  </form>;
}
