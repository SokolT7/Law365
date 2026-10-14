import { ResearchDraftProvider } from "@/components/ResearchDraft";
import Sidebar from "@/components/Sidebar";
import { workspaceSession } from "@/lib/workspace";

export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { user, firm } = await workspaceSession();
  return <div className="app" style={{ "--firm-accent": firm.accent } as React.CSSProperties}>
    <a className="skip-link" href="#main-content">Preskoči na sadržaj</a>
    <Sidebar firmName={firm.name} userName={user.name} userRole={user.role === "firm_admin" ? "Administrator ureda" : "Član ureda"} features={firm.features} accent={firm.accent} />
    <main id="main-content" className="main"><ResearchDraftProvider key={user.id}>{children}</ResearchDraftProvider></main>
  </div>;
}
