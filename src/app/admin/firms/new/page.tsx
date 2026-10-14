import Link from "next/link";
import FirmEditor from "@/components/admin/FirmEditor";
import { requireAdminPage } from "@/components/admin/requireAdmin";

export default async function NewFirmPage() {
  await requireAdminPage();
  return <><Link href="/admin/firms" className="admin-back-link">← Svi uredi</Link><div className="admin-page-heading"><div><p className="eyebrow">Novi radni prostor</p><h1>Pripremite ured.</h1><p>Postavite identitet i funkcije. Nakon spremanja pozovite korisnike i aktivirajte pristup.</p></div></div><FirmEditor /></>;
}
