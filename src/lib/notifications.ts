import type { DB } from "@/lib/types";
import { hasFeature } from "@/lib/features";
import type { NotificationItem } from "@/components/shell/WorkspaceContext";

const MODE = { sazetak: "Sažetak", detaljna: "Detaljna analiza" } as const;

/** Notifications derived from workspace data the user may already see (newest first). */
export function workspaceNotifications(db: DB, firm: { features: readonly string[] }): NotificationItem[] {
  const since = Date.now() - 14 * 86400000;
  const items: NotificationItem[] = [];
  if (hasFeature(firm, "documents")) {
    for (const doc of db.documents) for (const a of doc.analyses) {
      const href = `/dokumenti/${doc.id}?analiza=${a.mode}`;
      const at = a.completedAt ?? a.createdAt;
      if (a.status === "u_obradi") items.push({ id: `p:${doc.id}:${a.mode}`, kind: "processing", title: `${MODE[a.mode]} u izradi`, sub: doc.title, href, at: a.createdAt });
      else if (Date.parse(at) >= since) items.push(a.status === "greska"
        ? { id: `e:${doc.id}:${a.mode}:${at}`, kind: "error", title: `Obrada nije uspjela: ${MODE[a.mode]}`, sub: doc.title, href, at }
        : { id: `a:${doc.id}:${a.mode}:${at}`, kind: "analysis", title: `Spremno: ${MODE[a.mode]}`, sub: doc.title, href, at });
    }
  }
  if (hasFeature(firm, "regulatory_tracking")) {
    for (const r of db.regUpdates ?? []) if (!r.reviewed) items.push({ id: `r:${r.id}`, kind: "regulation", title: r.title, sub: `Promjena propisa · ${r.source}`, href: "/propisi?prikaz=novo", at: r.date });
  }
  return items.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 20);
}
