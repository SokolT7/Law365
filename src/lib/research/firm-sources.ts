import { legalStatus, legalActs } from "@/lib/legal/store";
import { effectiveSources } from "@/lib/sources";
import type { DB } from "@/lib/types";

/** Server-side view of a firm's sources: what is connected and what the firm has enabled. */
export function firmSources(db: Pick<DB, "settings">) {
  const status = legalStatus();
  const connected = status.map((s) => s.sourceId);
  return { sources: effectiveSources(db.settings, connected), connected, status };
}

export { legalActs };
