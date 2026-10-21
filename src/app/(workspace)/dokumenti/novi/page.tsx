import { readWorkspaceDB as readDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { hasFeature } from "@/lib/features";
import { getMode } from "@/lib/ai/client";
import { PageHeader } from "@/components/ui";
import DraftStudio from "@/components/drafting/DraftStudio";

export const dynamic = "force-dynamic";

const INTERNAL_CLIENT = "Ručno učitani dokument";

export default async function NewDocumentPage({ searchParams }: { searchParams: Promise<{ klijent?: string }> }) {
  const { klijent } = await searchParams;
  const session = await workspaceSession("documents");
  const db = await readDB();
  const clients = hasFeature(session.firm, "clients") ? db.clients.filter((c) => c.name !== INTERNAL_CLIENT).map((c) => ({ id: c.id, name: c.name })) : [];
  return <>
    <PageHeader title="Novi dokument" back={{ href: "/dokumenti", label: "Dokumenti" }} />
    <div className="content">
      <DraftStudio clients={clients} aiEnabled={getMode() === "live"} initialClientId={clients.some((c) => c.id === klijent) ? klijent : ""} />
    </div>
  </>;
}
