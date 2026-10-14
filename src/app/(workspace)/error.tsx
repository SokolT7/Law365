"use client";
export default function WorkspaceError({ reset }: { reset: () => void }) {
  return <div className="content"><div className="card card-pad empty" role="alert"><h2>Nije moguće učitati radni prostor</h2><p>Pokušajte ponovno. Ako je pristup promijenjen, prijavite se ponovno.</p><button className="btn btn-primary" onClick={reset}>Pokušaj ponovno</button> <a className="btn" href="/prijava">Prijava</a></div></div>;
}
