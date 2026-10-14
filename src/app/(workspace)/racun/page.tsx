import LogoutButton from "@/components/LogoutButton";
import { workspaceSession } from "@/lib/workspace";
import { PageHeader } from "@/components/ui";
import PasswordForm from "@/components/PasswordForm";
export default async function AccountPage(){
 const {user,firm}=await workspaceSession();
 return <><PageHeader title="Moj račun" subtitle="Vaš identitet i pristup radnom prostoru."/><div className="content"><div className="grid grid-2"><section className="card card-pad"><h2 className="upload-heading">Podaci o računu</h2><dl className="kv"><dt>E-mail</dt><dd>{user.email}</dd><dt>Ured</dt><dd>{firm.name}</dd><dt>Uloga</dt><dd>{user.role==="firm_admin"?"Administrator ureda":"Član ureda"}</dd></dl><p className="muted">Za promjene podataka i pristupa obratite se LTB administratoru.</p><LogoutButton/></section><section className="card card-pad"><h2 className="upload-heading">Promjena lozinke</h2><p className="muted">Nakon promjene ponovno se prijavite. Ostale sesije bit će zatvorene.</p><PasswordForm/></section></div></div></>;
}
