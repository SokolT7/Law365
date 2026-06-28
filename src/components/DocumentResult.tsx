import type { ExtractionResult, Izvor } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { AiNote } from "@/components/ui";

function Src({ izvor }: { izvor?: Izvor }) {
  if (!izvor || (!izvor.clanak && !izvor.citat)) return null;
  return (
    <details className="src">
      <summary>detaljnije{izvor.clanak ? ` · ${izvor.clanak}` : ""}</summary>
      {izvor.citat && <div className="src-quote">„{izvor.citat}”</div>}
    </details>
  );
}

function Card({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="card-head">
        <h3>{title}</h3>
        {typeof count === "number" && <span className="muted">{count}</span>}
      </div>
      <div className="card-pad">{children}</div>
    </div>
  );
}

export default function DocumentResult({ result }: { result: ExtractionResult }) {
  return (
    <>
      {/* Sažetak */}
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="flex between mb-8">
          <h3>Sažetak</h3>
          <AiNote />
        </div>
        <p style={{ margin: 0, color: "#3a4660", lineHeight: 1.65 }}>{result.sazetak}</p>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 18 }}>
        {/* Strane */}
        <Card title="Ugovorne strane" count={result.strane.length}>
          {result.strane.map((s, i) => (
            <div key={i} className="res-item">
              <div>
                <b style={{ color: "var(--navy)" }}>{s.naziv}</b>
                {s.uloga && <span className="chip" style={{ marginLeft: 8 }}>{s.uloga}</span>}
              </div>
              <div className="res-sub">
                {[s.oib && `OIB: ${s.oib}`, s.adresa].filter(Boolean).join(" · ")}
              </div>
              <Src izvor={s.izvor} />
            </div>
          ))}
        </Card>

        {/* Ključni uvjeti */}
        <Card title="Ključni uvjeti" count={result.kljucniUvjeti.length}>
          {result.kljucniUvjeti.map((k, i) => (
            <div key={i} className="res-item">
              <div className="flex between">
                <span className="res-label">{k.naziv}</span>
                <span style={{ fontWeight: 600, textAlign: "right" }}>{k.vrijednost}</span>
              </div>
              <Src izvor={k.izvor} />
            </div>
          ))}
        </Card>
      </div>

      {/* Odredbe po člancima */}
      {result.odredbePoClancima.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <Card title="Odredbe po člancima" count={result.odredbePoClancima.length}>
            {result.odredbePoClancima.map((c, i) => (
              <div key={i} className="res-item">
                <div style={{ fontWeight: 700, color: "var(--navy)" }}>{c.naslov}</div>
                <div className="res-sub">{c.sazetak}</div>
                <Src izvor={c.izvor} />
              </div>
            ))}
          </Card>
        </div>
      )}

      <div className="grid grid-2" style={{ marginBottom: 18 }}>
        {/* Datumi i rokovi */}
        <Card title="Datumi i rokovi" count={result.datumiIRokovi.length}>
          {result.datumiIRokovi.map((d, i) => (
            <div key={i} className="res-item">
              <div className="flex between">
                <span>{d.opis}</span>
                <span className="chip mono">{d.datum ? formatDate(d.datum) : d.vrsta || "rok"}</span>
              </div>
              <Src izvor={d.izvor} />
            </div>
          ))}
        </Card>

        {/* Iznosi */}
        <Card title="Iznosi" count={result.iznosi.length}>
          {result.iznosi.length === 0 && <div className="empty">Nema navedenih iznosa.</div>}
          {result.iznosi.map((a, i) => (
            <div key={i} className="res-item">
              <div className="flex between">
                <span>{a.opis}</span>
                <span style={{ fontWeight: 700, color: "var(--navy)" }}>
                  {a.iznos} {a.valuta || ""}
                </span>
              </div>
              <Src izvor={a.izvor} />
            </div>
          ))}
        </Card>
      </div>

      <div className="grid grid-2" style={{ marginBottom: 18 }}>
        {/* Obveze */}
        <Card title="Obveze" count={result.obveze.length}>
          {result.obveze.map((o, i) => (
            <div key={i} className="res-item">
              <div>
                {o.strana && <span className="chip" style={{ marginRight: 8 }}>{o.strana}</span>}
                {o.opis}
              </div>
              {o.rok && <div className="res-sub">Rok: {o.rok}</div>}
              <Src izvor={o.izvor} />
            </div>
          ))}
        </Card>

        {/* Prava */}
        <Card title="Prava" count={result.prava.length}>
          {result.prava.length === 0 && <div className="empty">Nema izdvojenih prava.</div>}
          {result.prava.map((p, i) => (
            <div key={i} className="res-item">
              <div>
                {p.strana && <span className="chip" style={{ marginRight: 8 }}>{p.strana}</span>}
                {p.opis}
              </div>
              <Src izvor={p.izvor} />
            </div>
          ))}
        </Card>
      </div>

      {/* Pravo / nadležnost / prestanak */}
      <div className="grid grid-3" style={{ marginBottom: 18 }}>
        <Card title="Mjerodavno pravo">
          <div>{result.mjerodavnoPravo?.pravo ?? "—"}</div>
          <Src izvor={result.mjerodavnoPravo?.izvor} />
        </Card>
        <Card title="Nadležnost">
          <div>{result.nadleznost?.opis ?? "—"}</div>
          <Src izvor={result.nadleznost?.izvor} />
        </Card>
        <Card title="Prestanak / otkaz">
          <div>{result.prestanak?.opis ?? "—"}</div>
          {result.prestanak?.otkazniRok && (
            <div className="res-sub">Otkazni rok: {result.prestanak.otkazniRok}</div>
          )}
          <Src izvor={result.prestanak?.izvor} />
        </Card>
      </div>

      <div className="grid grid-2">
        {/* Reference */}
        <Card title="Reference (propisi)" count={result.reference.length}>
          {result.reference.length === 0 && <div className="empty">Nema navedenih propisa.</div>}
          {result.reference.map((r, i) => (
            <div key={i} className="res-item">
              <div>{r.propis}</div>
              <Src izvor={r.izvor} />
            </div>
          ))}
        </Card>

        {/* Napomene */}
        <Card title="Napomene" count={result.napomene.length}>
          {result.napomene.length === 0 && <div className="empty">Nema dodatnih napomena.</div>}
          {result.napomene.map((n, i) => (
            <div key={i} className="res-item">
              <div>{n.opis}</div>
              <Src izvor={n.izvor} />
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
