"use client";

import { useCallback, useRef, useState } from "react";
import type { DeadlineCalculation, ResearchMessage, SearchStep, SourceRecord, StreamEvent, Verification } from "@/lib/research/types";

export interface LiveAnswer {
  running: boolean;
  steps: SearchStep[];
  sources: SourceRecord[];
  text: string;
  calculation?: DeadlineCalculation;
  verification?: Verification;
}

const EMPTY: LiveAnswer = { running: false, steps: [], sources: [], text: "" };

/** Posts a question to a streaming endpoint and exposes the live answer; `stop()` aborts the request. */
export function useAnswerStream() {
  const [live, setLive] = useState<LiveAnswer>(EMPTY);
  const controller = useRef<AbortController | null>(null);

  const stop = useCallback(() => controller.current?.abort(), []);
  const reset = useCallback(() => setLive(EMPTY), []);

  const start = useCallback(async (url: string, body: unknown, handlers: { onThread?: (threadId: string) => void } = {}): Promise<{ message?: ResearchMessage; error?: string; aborted?: boolean }> => {
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    setLive({ ...EMPTY, running: true });
    let message: ResearchMessage | undefined;
    let error: string | undefined;
    try {
      const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal: ac.signal });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Odgovor trenutačno nije dostupan.");
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const data = frame.split("\n").filter((l) => l.startsWith("data: ")).map((l) => l.slice(6)).join("\n");
          if (!data) continue;
          const event = JSON.parse(data) as StreamEvent;
          switch (event.type) {
            case "thread": handlers.onThread?.(event.threadId); break;
            case "status": setLive((s) => { const steps = s.steps.some((x) => x.id === event.step.id) ? s.steps.map((x) => (x.id === event.step.id ? event.step : x)) : [...s.steps, event.step]; return { ...s, steps }; }); break;
            case "sources": setLive((s) => ({ ...s, sources: event.sources })); break;
            case "delta": setLive((s) => ({ ...s, text: s.text + event.text })); break;
            case "calculation": setLive((s) => ({ ...s, calculation: event.calculation })); break;
            case "verification": setLive((s) => ({ ...s, verification: event.verification })); break;
            case "complete": message = event.message; setLive((s) => ({ ...s, text: event.message.text })); break;
            case "error": error = event.message; break;
          }
        }
      }
    } catch (err) {
      if (ac.signal.aborted) { setLive((s) => ({ ...s, running: false })); return { aborted: true }; }
      error = err instanceof Error ? err.message : "Odgovor trenutačno nije dostupan.";
    }
    setLive((s) => ({ ...s, running: false }));
    return { message, error };
  }, []);

  return { live, start, stop, reset };
}
