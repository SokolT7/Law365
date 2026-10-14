import { readWorkspaceDB as readDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { PageHeader } from "@/components/ui";
import PlaybookManager from "@/components/research/PlaybookManager";
import { allPlaybooks } from "@/lib/research/playbooks";

export const dynamic = "force-dynamic";

export default async function PlaybooksPage() {
  const session = await workspaceSession("legal_questions");
  const db = await readDB();
  return <>
    <PageHeader title="Asistenti" subtitle="Specijalizirani istraživački asistenti LTB Law i vašeg ureda" />
    <div className="content"><PlaybookManager initial={allPlaybooks(db.settings?.playbooks)} canManage={session.user.role === "firm_admin"} /></div>
  </>;
}
