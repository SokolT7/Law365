import { readDB } from "@/lib/db";
import { PageHeader, TenantBanner } from "@/components/ui";
import SourceToggle from "@/components/SourceToggle";
import { SOURCE_GROUPS, defaultSources, allSourceItems } from "@/lib/sources";

export const dynamic = "force-dynamic";

export default async function IzvoriPage() {
  const db = await readDB();
  const sources = db.settings?.sources ?? defaultSources();
  const items = allSourceItems();
  const active = items.filter((s) => sources[s.id]).length;

  return (
    <>
      <PageHeader
        title="Izvori prava"
        subtitle="Odaberite na koje se izvore AI oslanja pri analizi i odgovorima"
      />
      <div className="content">
        <TenantBanner />

        <div className="izvori-intro">
          <div>
            <div className="ii-count">
              <b>{active}</b> / {items.length} aktivnih izvora
            </div>
            <p className="ii-text">
              Uključite ili isključite izvore koje AI smije koristiti. <b>Vaši izvori</b> su povezani i
              koriste se odmah; vanjske pravne baze (Narodne novine, EUR-Lex, regulatori) aktiviraju se
              pri uvođenju za vaš ured. Tako svaki odgovor ima jasno i kontrolirano podrijetlo.
            </p>
          </div>
        </div>

        {SOURCE_GROUPS.map((g) => (
          <div className="card" key={g.id} style={{ marginBottom: 16 }}>
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
                      <span className={`src-tag ${it.status}`}>
                        {it.status === "connected" ? "Povezano" : "Dostupno"}
                      </span>
                    </div>
                    <div className="src-desc">{it.desc}</div>
                  </div>
                  <SourceToggle id={it.id} enabled={!!sources[it.id]} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
