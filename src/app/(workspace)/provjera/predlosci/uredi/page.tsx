import { notFound } from "next/navigation";
import { readWorkspaceDB as readDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { PageHeader } from "@/components/ui";
import TemplateEditor from "@/components/review/TemplateEditor";
import { BUILT_IN_TEMPLATES } from "@/lib/review-templates";

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({ searchParams }: { searchParams: Promise<{ id?: string; izvor?: string }> }) {
  const { id, izvor } = await searchParams;
  const session = await workspaceSession("contract_review");
  const db = await readDB();
  const template = id ? db.settings?.reviewTemplates?.find((t) => t.id === id) : undefined;
  if (id && !template) notFound();
  const copyFrom = !template && izvor ? BUILT_IN_TEMPLATES.find((t) => t.id === izvor) : undefined;
  const canEdit = session.user.role === "firm_admin";
  const title = template ? template.name : copyFrom ? `Kopija: ${copyFrom.name}` : "Novi predložak";
  return <>
    <PageHeader title={title} subtitle={canEdit ? "Promjene se primjenjuju na sljedeću provjeru; prethodne odluke ostaju sačuvane." : "Predloške uređuje administrator ureda."} crumbs={[{ href: "/provjera", label: "Provjera ugovora" }, { href: "/provjera/predlosci", label: "Predlošci" }, { label: title }]} />
    <div className="content">
      <TemplateEditor template={template} copyFrom={copyFrom} canEdit={canEdit} documents={[...db.documents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((d) => ({ id: d.id, title: d.title }))} />
    </div>
  </>;
}
