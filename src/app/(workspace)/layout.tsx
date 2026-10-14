import { ResearchDraftProvider } from "@/components/ResearchDraft";
import WorkspaceShell from "@/components/shell/WorkspaceShell";
import type { NavCounts } from "@/components/Sidebar";
import { readWorkspaceDB } from "@/lib/db";
import { hasFeature } from "@/lib/features";
import { workspaceSession } from "@/lib/workspace";
import { activeClientScope } from "@/lib/scope";

export const dynamic = "force-dynamic";

const INTERNAL_CLIENT = "Ručno učitani dokument";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { user, firm } = await workspaceSession();
  const db = await readWorkspaceDB();
  const clientName = new Map(db.clients.map((client) => [client.id, client.name]));

  const counts: NavCounts = {};
  const processing = db.documents.filter((doc) => doc.analyses.some((analysis) => analysis.status === "u_obradi")).length;
  if (processing) counts["/dokumenti"] = { value: processing, label: `${processing} u obradi` };
  const unreviewed = (db.regUpdates ?? []).filter((update) => !update.reviewed);
  if (hasFeature(firm, "regulatory_tracking") && unreviewed.length) {
    counts["/propisi"] = { value: unreviewed.length, alert: unreviewed.some((update) => update.severity === "visoka"), label: `${unreviewed.length} nepregledanih promjena` };
  }

  // Lightweight index for the command palette; only what this user may already see.
  const palette = {
    documents: hasFeature(firm, "documents") ? [...db.documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 300).map((doc) => {
      const client = clientName.get(doc.clientId);
      return { id: doc.id, title: doc.title, type: doc.type, client: client && client !== INTERNAL_CLIENT ? client : undefined };
    }) : [],
    // readWorkspaceDB limits research history to the signed-in user.
    research: hasFeature(firm, "legal_questions") ? (db.research ?? []).slice(0, 50).map((t) => ({ id: t.id, title: t.title, updatedAt: t.updatedAt })) : [],
    clients: hasFeature(firm, "clients") ? db.clients.filter((client) => client.name !== INTERNAL_CLIENT).sort((a, b) => a.name.localeCompare(b.name, "hr")).map((client) => ({ id: client.id, name: client.name, sector: client.sector })) : [],
  };

  const scope = hasFeature(firm, "clients") ? await activeClientScope(db) : null;

  return <WorkspaceShell
    clientScope={scope}
    userId={user.id}
    firmName={firm.name}
    userName={user.name}
    userRole={user.role === "firm_admin" ? "Administrator ureda" : "Član ureda"}
    features={[...firm.features]}
    counts={counts}
    palette={palette}
    accent={firm.accent}
  >
    <ResearchDraftProvider key={user.id}>{children}</ResearchDraftProvider>
  </WorkspaceShell>;
}
