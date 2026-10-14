"use client";
import { createContext, useContext, useRef, useState } from "react";

type DraftContext = { draft: string; setDraft: (value: string) => void; submitOnArrival: React.MutableRefObject<boolean> };
const Context = createContext<DraftContext | null>(null);

/** Keeps an unsent research question in memory (never in storage or URLs) while moving between pages. */
export function ResearchDraftProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraft] = useState("");
  const submitOnArrival = useRef(false);
  return <Context.Provider value={{ draft, setDraft, submitOnArrival }}>{children}</Context.Provider>;
}

export function useResearchDraft() {
  const context = useContext(Context);
  if (!context) throw new Error("Research draft requires workspace context.");
  return context;
}
