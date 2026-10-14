"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { IArrowRight, ISearch } from "@/components/Icons";
import { useResearchDraft } from "@/components/ResearchDraft";

/** Dashboard entry to research: pressing Enter opens the research page and asks immediately. */
export default function AskBar({ documentCount }: { documentCount: number }) {
  const { draft, setDraft, submitOnArrival } = useResearchDraft();
  const router = useRouter();
  return <>
    <form className="ask-bar" role="search" onSubmit={(event) => { event.preventDefault(); submitOnArrival.current = !!draft.trim(); router.push("/pitanja"); }}>
      <ISearch aria-hidden="true" />
      <label className="sr-only" htmlFor="ask-bar">Pravno pitanje</label>
      <input id="ask-bar" maxLength={12000} value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Što želite istražiti? Npr. koji ugovori imaju automatsko produljenje?" autoComplete="off" />
      <Button type="submit" variant="primary" iconEnd={<IArrowRight />}>{draft.trim() ? "Pitaj" : "Istraži"}</Button>
    </form>
    <p className="ask-hint">Pretražuje {documentCount} {documentCount === 1 ? "dokument" : "dokumenata"} ureda · odgovori uključuju izvore</p>
  </>;
}
