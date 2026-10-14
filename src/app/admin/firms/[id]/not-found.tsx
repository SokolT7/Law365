import Link from "next/link";

export default function FirmNotFound() {
  return <div className="admin-panel admin-empty"><h1>Ured nije pronađen.</h1><p>Provjerite poveznicu ili odaberite ured iz registra.</p><Link className="btn" href="/admin/firms">Otvori registar ureda</Link></div>;
}
