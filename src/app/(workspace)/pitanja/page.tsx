import { activeClientScope } from "@/lib/scope";
import ScopeNotice from "@/components/shell/ScopeNotice";
import { readWorkspaceDB as readDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { hasFeature } from "@/lib/features";
import { PageHeader } from "@/components/ui";
import ResearchWorkspace from "@/components/research/ResearchWorkspace";
import { firmSources } from "@/lib/research/firm-sources";
import { allPlaybooks, RESEARCH_STARTERS } from "@/lib/research/playbooks";
import { allSourceItems, isSourceAvailable } from "@/lib/sources";

export const dynamic = "force-dynamic";

export default async function AskPage({ searchParams }: { searchParams: Promise<{ nit?: string; asistent?: string }> }) {
  const { nit, asistent } = await searchParams;
  const session = await workspaceSession("legal_questions");
  const db = await readDB();
  const scope = firmSources(db);
  const clientScope = hasFeature(session.firm, "clients") ? await activeClientScope(db) : null;
  // readWorkspaceDB already limits research history to the signed-in user.
  const threads = (db.research ?? []).map((t) => ({ id: t.id, title: t.title, updatedAt: t.updatedAt, messages: t.messages.length }));
  const thread = nit ? db.research?.find((t) => t.id === nit) : undefined;
  const items = allSourceItems().filter((s) => isSourceAvailable(s.id, scope.connected));
  const enabled = items.filter((s) => scope.sources[s.id]).map((s) => s.name);

  return (
    <>
      <PageHeader title="Pitanja" />
      <div className="content research-content">
        <ResearchWorkspace
          key={thread?.id ?? `new-${asistent ?? ""}`}
          initialThreads={threads}
          initialThread={thread}
          initialPlaybookId={thread ? undefined : asistent}
          initialClientId={thread ? undefined : clientScope?.id}
          playbooks={allPlaybooks(db.settings?.playbooks)}
          starters={RESEARCH_STARTERS}
          sourceScope={{ enabled, available: items.length }}
          hasDocumentSource={hasFeature(session.firm, "documents") && scope.sources["vasi-dokumenti"] !== false}
          clients={hasFeature(session.firm, "clients") ? db.clients.filter((c) => c.name !== "Ručno učitani dokument").map((c) => ({ id: c.id, name: c.name })) : []}
        />
      </div>
    </>
  );
}
