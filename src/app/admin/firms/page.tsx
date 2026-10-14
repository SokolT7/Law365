import Link from "next/link";
import FirmRegister from "@/components/admin/FirmRegister";
import { listFirms, listUsers } from "@/lib/platform";
import { requireAdminPage } from "@/components/admin/requireAdmin";

export default async function FirmsPage() {
  await requireAdminPage();
  const firms = listFirms().map((firm) => ({ ...firm, userCount: listUsers(firm.id).length }));
  return <><div className="admin-page-heading"><div><p className="eyebrow">Radni prostori</p><h1>Uredi</h1><p>Identitet, korisnici i dostupne funkcije svakog ureda.</p></div><Link className="btn btn-primary" href="/admin/firms/new">Dodaj ured <span aria-hidden="true">+</span></Link></div><FirmRegister firms={firms} /></>;
}
