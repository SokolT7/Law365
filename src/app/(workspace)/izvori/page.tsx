import { readWorkspaceDB as readDB } from "@/lib/db";
import { workspaceSession } from "@/lib/workspace";
import { hasFeature } from "@/lib/features";
import { PageHeader, TenantBanner } from "@/components/ui";
import SourceToggle from "@/components/SourceToggle";
import { SOURCE_GROUPS, allSourceItems, isSourceAvailable } from "@/lib/sources";
import { firmSources, legalActs } from "@/lib/research/firm-sources";
import { RelativeTime } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function IzvoriPage() {
  const session = await workspaceSession("source_settings");
  const db = await readDB();
  const { sources, connected, status } = firmSources(db);
  const acts = legalActs();
  const items = allSourceItems();
  const active = items.filter((s) => sources[s.id]).length;

  return (
    <>
      <PageHeader title="Izvori prava" back={{ href: "/postavke", label: "Postavke" }} />
      <div className="content">
        <TenantBanner />

        <div className="izvori-intro">
          <div>
            <div className="ii-count">
              <b>{active}</b> / {items.length} aktivnih izvora
            </div>
            <p className="ii-text">
              Odaberite izvore na koje se oslanja istraživanje. Propisi se preuzimaju sa službenih izvora
              (Narodne novine, Ured za publikacije EU, odluke.sudovi.hr); svaki odgovor citira točan članak ili odluku.
            </p>
          </div>
        </div>

        {SOURCE_GROUPS.map((g) => (
          <div className="card stack-gap" key={g.id}>
            <div className="card-head">
              <h3>{g.title}</h3>
              <span className="muted">
                {g.items.filter((it) => sources[it.id]).length}/{g.items.length}
              </span>
            </div>
            <div>
              {g.items.map((it) => (
                <div className="src-row" key={it.id}>
                  <div className="src-main">
                    <div className="src-name-row">
                      <span className="src-name">{it.name}</span>
                      <span className={`src-tag ${isSourceAvailable(it.id, connected) ? "connected" : "available"}`}>
                        {isSourceAvailable(it.id, connected) ? "Povezano" : "Nije povezano"}
                      </span>
                    </div>
                    <div className="src-desc">{it.desc}</div>
                    {(() => { const st = status.find((x) => x.sourceId === it.id); if (!st) return null; const list = acts.filter((a) => a.source === it.id);
                      return <div className="src-coverage">
                        <span>{st.units.toLocaleString("hr-HR")} {["rh-zakoni", "eu-propisi"].includes(it.id) ? "članaka" : "odluka"}{st.updatedAt && <> · ažurirano <RelativeTime iso={st.updatedAt} /></>}</span>
                        {it.id !== "rh-praksa" && <span className="t-sub">{list.map((a) => `${a.short ?? a.title} (${a.citation})`).join(" · ")}</span>}
                      </div>; })()}
                  </div>
                  <SourceToggle id={it.id} enabled={!!sources[it.id]} disabled={session.user.role !== "firm_admin" || !isSourceAvailable(it.id, connected)} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
