import Link from "next/link";
import { readDB } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader, TenantBanner } from "@/components/ui";
import { IUsers, IDocs, IFlag } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const db = await readDB();
  const regs = db.regUpdates ?? [];

  const clients = db.clients
    .filter((c) => c.name !== "Ručno učitani dokument")
    .map((c) => {
      const docs = db.documents.filter((d) => d.clientId === c.id);
      const matters = db.matters.filter((m) => m.clientId === c.id);
      const alerts = regs.filter((r) => !r.reviewed && r.affectedClientIds.includes(c.id));
      const latest = docs.reduce<string | null>(
        (acc, d) => (!acc || d.createdAt > acc ? d.createdAt : acc),
        null
      );
      return { client: c, docs, matters, alerts, latest };
    })
    .sort((a, b) => a.client.name.localeCompare(b.client.name, "hr"));

  return (
    <>
      <PageHeader
        title="Klijenti"
        subtitle="Dokumenti, predmeti i regulatorna upozorenja po klijentu"
      />
      <div className="content">
        <TenantBanner />
        {clients.length === 0 ? (
          <div className="card card-pad empty">
            Još nema klijenata. Klijenti se dodjeljuju pri učitavanju dokumenta.
          </div>
        ) : (
          <div className="client-grid">
            {clients.map(({ client, docs, matters, alerts, latest }) => (
              <Link key={client.id} href={`/klijenti/${client.id}`} className="client-card">
                <div className="cc-top">
                  <span className="cc-avatar">{initials(client.name)}</span>
                  <div className="cc-id">
                    <span className="cc-name">{client.name}</span>
                    <span className="cc-sector">{client.sector}</span>
                  </div>
                  {alerts.length > 0 && (
                    <span className="cc-alert" title="Nova regulatorna upozorenja">
                      <IFlag size={12} /> {alerts.length}
                    </span>
                  )}
                </div>
                <div className="cc-stats">
                  <span><IDocs size={13} /> {docs.length} {docs.length === 1 ? "dokument" : "dokumenta"}</span>
                  <span><IUsers size={13} /> {matters.length} {matters.length === 1 ? "predmet" : "predmeta"}</span>
                </div>
                <div className="cc-foot">
                  {client.oib && <span className="mono">OIB {client.oib}</span>}
                  {latest && <span>zadnji dokument {formatDate(latest)}</span>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function initials(name: string): string {
  return name
    .replace(/\s*(d\.o\.o\.|d\.d\.|j\.d\.o\.o\.|obrt)\s*$/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}
