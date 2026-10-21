import NewClientForm from "@/components/NewClientForm";
import Link from "next/link";
import { readWorkspaceDB as readDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { hasFeature } from "@/lib/features";
import { formatDate } from "@/lib/format";
import { PageHeader, EmptyState } from "@/components/ui";
import AutoFilter from "@/components/AutoFilter";
import { Suspense } from "react";
import { IUsers, IDocs, IFlag, ISearch } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default async function ClientsPage({searchParams}:{searchParams:Promise<{q?:string}>}) {
  const {q=""}=await searchParams;
  const session = await workspaceSession("clients");
  const db = await readDB();
  const regs = db.regUpdates ?? [];

  const clients = db.clients
    .filter((c) => c.name !== "Ručno učitani dokument")
    .filter(c => !q || `${c.name} ${c.sector} ${c.oib || ""}`.toLocaleLowerCase("hr").includes(q.toLocaleLowerCase("hr")))
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
      <PageHeader title="Klijenti">
        <Suspense><NewClientForm /></Suspense>
      </PageHeader>
      <div className="content">
        <AutoFilter resultLabel={q ? `${clients.length} rezultata` : undefined} clearHref="/klijenti" active={!!q}>
          <label className="search-field"><ISearch aria-hidden="true" /><span className="sr-only">Pretraži klijente</span><input type="search" name="q" defaultValue={q} placeholder="Pretraži naziv, djelatnost ili OIB…" /></label>
        </AutoFilter>
        {clients.length === 0 ? (
          <div className="card">{q
            ? <EmptyState icon={<ISearch />} title="Nema klijenata za ovu pretragu">Provjerite naziv ili OIB.</EmptyState>
            : <EmptyState icon={<IUsers />} title="Još nema klijenata">Dodajte prvog klijenta i povežite s njim dokumente i provjere.</EmptyState>}
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
                      <IFlag size={12} aria-hidden="true" /> {alerts.length}
                    </span>
                  )}
                </div>
                <div className="cc-stats">
                  <span><IDocs size={14} aria-hidden="true" /> {docs.length} {docs.length === 1 ? "dokument" : docs.length < 5 && docs.length > 1 ? "dokumenta" : "dokumenata"}</span>
                  <span><IUsers size={14} aria-hidden="true" /> {matters.length} {matters.length === 1 ? "predmet" : "predmeta"}</span>
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
