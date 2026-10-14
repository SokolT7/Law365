import Link from "next/link";
export default function NotFound() {
  return <div className="content"><div className="card card-pad empty"><h1>Sadržaj nije dostupan</h1><p>Stranica ne postoji ili nije dostupna vašem uredu.</p><Link className="btn btn-primary" href="/">Natrag na pregled</Link></div></div>;
}
