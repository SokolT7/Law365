"use client";

export default function AdminError({ reset }: { reset: () => void }) {
  return <div className="admin-panel"><p className="eyebrow">Administracija</p><h1>Pregled nije moguće učitati.</h1><p>Provjerite vezu i pokušajte ponovno. Već spremljene promjene ostaju sačuvane.</p><button className="btn btn-primary" onClick={reset}>Pokušaj ponovno</button></div>;
}
