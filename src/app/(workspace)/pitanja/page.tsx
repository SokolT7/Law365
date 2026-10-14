import { readWorkspaceDB as readDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { hasFeature } from "@/lib/features";
import { PageHeader, TenantBanner } from "@/components/ui";
import AskChat from "@/components/AskChat";
import SourcesDropdown from "@/components/SourcesDropdown";
import EvidenceWorkspace from "@/components/EvidenceWorkspace";
import { defaultSources } from "@/lib/sources";

export const dynamic = "force-dynamic";

export default async function AskPage() {
  const session = await workspaceSession("legal_questions");
  const db = await readDB();
  const sources = db.settings?.sources ?? defaultSources();


  return (
    <>
      <PageHeader
        title="Pravna pitanja"
        subtitle="Istražite dostupne dokumente i provjerite dokaze uz odgovor"
      >
        {session.user.role === "firm_admin" && hasFeature(session.firm, "source_settings") && <SourcesDropdown sources={sources} />}
      </PageHeader>
      <div className="content">
        <TenantBanner />
        <EvidenceWorkspace><AskChat hasDocumentSource={hasFeature(session.firm,"documents") && sources["vasi-dokumenti"] !== false}/></EvidenceWorkspace>
      </div>
    </>
  );
}
