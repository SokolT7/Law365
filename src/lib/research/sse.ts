import type { StreamEvent } from "@/lib/research/types";

/**
 * Wraps an event generator as a Server-Sent Events response. `onComplete` runs once with the
 * final message (persistence); errors become an `error` event instead of a broken stream.
 */
export function sseResponse(events: AsyncGenerator<StreamEvent>, onComplete?: (event: Extract<StreamEvent, { type: "complete" }>) => Promise<void>): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`)); } catch { /* client went away */ }
      };
      // Keep proxies from buffering or timing out during long answers.
      const keepAlive = setInterval(() => { try { controller.enqueue(encoder.encode(": keep-alive\n\n")); } catch { /* closed */ } }, 15000);
      try {
        for await (const event of events) {
          if (event.type === "complete" && onComplete) {
            try { await onComplete(event); }
            catch (error) { console.error("Research persistence failed", error); send({ type: "error", message: "Odgovor je prikazan, ali nije spremljen. Pokušajte ponovno." }); }
          }
          send(event);
        }
      } catch (error) {
        console.error("Research stream failed", error);
        send({ type: "error", message: "Odgovor trenutačno nije dostupan. Pokušajte ponovno." });
      } finally {
        clearInterval(keepAlive);
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "private, no-store, no-transform", Connection: "keep-alive", "X-Accel-Buffering": "no" },
  });
}
