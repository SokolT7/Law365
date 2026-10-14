import AdminNav from "@/components/admin/AdminNav";
import { requireAdminPage } from "@/components/admin/requireAdmin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminPage();
  return <div className="admin-shell"><AdminNav userName={session.user.name} /><main id="main-content" className="admin-content">{children}</main><footer className="admin-footer">LTB Law · Upravljanje privatnim radnim prostorima</footer></div>;
}
