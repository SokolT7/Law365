import type { ExtractionResult, Izvor } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { AiNote } from "@/components/ui";
import {
  IUsers,
  IList,
  ICoins,
  ICalendar,
  ICheck,
  IFlag,
  IDocs,
  IScale,
  IBook,
  IAlert,
} from "@/components/Icons";

function Src({ izvor }: { izvor?: Izvor | null }) {
  if (!izvor || (!izvor.clanak && !izvor.citat)) return null;
  return (
    <details className="src">
      <summary>detaljnije{izvor.clanak ? ` · ${izvor.clanak}` : ""}</summary>
      {izvor.citat && <div className="src-quote">„{izvor.citat}”</div>}
    </details>
  );
}

function Section({
  icon,
  title,
  count,
  full,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  count?: number;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`sec${full ? " sec-full" : ""}`}>
      <div className="sec-head">
        <span className="sec-icon">{icon}</span>
        <h3>{title}</h3>
        {typeof count === "number" && <span className="sec-count">{count}</span>}
      </div>
      <div className="sec-body">{children}</div>
    </section>
  );
}

export default function DocumentResult({ result }: { result: ExtractionResult }) {
  const parties = result.strane.map((s) => s.naziv).filter(Boolean);
  const amount = result.iznosi[0];

  const facts: { label: string; value: string }[] = [];
  if (parties.length) facts.push({ label: "Strane", value: parties.join("  ·  ") });
  if (amount) facts.push({ label: "Vrijednost", value: `${amount.iznos} ${amount.valuta ?? ""}`.trim() });
  if (result.mjerodavnoPravo?.pravo) facts.push({ label: "Mjerodavno pravo", value: result.mjerodavnoPravo.pravo });
  if (result.prestanak?.otkazniRok) facts.push({ label: "Otkazni rok", value: result.prestanak.otkazniRok });

  const hasLaw =
    result.mjerodavnoPravo?.pravo || result.nadleznost?.opis || result.prestanak?.opis;

  return (
    <div className="doc-result">
      {/* Sažetak */}
      <section className="summary-hero">
        <div className="sh-top">
          <span className="type-pill">{result.vrsta || "Dokument"}</span>
          <AiNote />
        </div>
        <p className="sh-text">{result.sazetak}</p>
      </section>

      {/* Ključne informacije */}
      {facts.length > 0 && (
        <div className="keyfacts">
          {facts.map((f, i) => (
            <div key={i} className="kf">
              <div className="kf-label">{f.label}</div>
              <div className="kf-value">{f.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="sec-grid">
        {result.obveze.length > 0 && (
          <Section icon={<ICheck size={15} />} title="Obveze" count={result.obveze.length}>
            {result.obveze.map((o, i) => (
              <div key={i} className="rrow">
                <div>
                  {o.strana && <span className="mini-chip">{o.strana}</span>}
                  {o.opis}
                </div>
                {o.rok && <div className="rrow-sub">Rok: {o.rok}</div>}
                <Src izvor={o.izvor} />
              </div>
            ))}
          </Section>
        )}

        {result.datumiIRokovi.length > 0 && (
          <Section icon={<ICalendar size={15} />} title="Datumi i rokovi" count={result.datumiIRokovi.length}>
            {result.datumiIRokovi.map((d, i) => (
              <div key={i} className="rrow">
                <div className="rrow-line">
                  <span>{d.opis}</span>
                  <span className="date-chip">{d.datum ? formatDate(d.datum) : d.vrsta || "rok"}</span>
                </div>
                <Src izvor={d.izvor} />
              </div>
            ))}
          </Section>
        )}

        {result.strane.length > 0 && (
          <Section icon={<IUsers size={15} />} title="Ugovorne strane" count={result.strane.length}>
            {result.strane.map((s, i) => (
              <div key={i} className="rrow">
                <div className="rrow-line">
                  <span style={{ fontWeight: 600, color: "var(--navy)" }}>{s.naziv}</span>
                  {s.uloga && <span className="mini-chip">{s.uloga}</span>}
                </div>
                {(s.oib || s.adresa) && (
                  <div className="rrow-sub">{[s.oib && `OIB: ${s.oib}`, s.adresa].filter(Boolean).join(" · ")}</div>
                )}
                <Src izvor={s.izvor} />
              </div>
            ))}
          </Section>
        )}

        {result.kljucniUvjeti.length > 0 && (
          <Section icon={<IList size={15} />} title="Ključni uvjeti" count={result.kljucniUvjeti.length}>
            {result.kljucniUvjeti.map((k, i) => (
              <div key={i} className="rrow">
                <div className="rrow-line">
                  <span className="kf-label2">{k.naziv}</span>
                  <span className="kf-value2">{k.vrijednost}</span>
                </div>
                <Src izvor={k.izvor} />
              </div>
            ))}
          </Section>
        )}

        {result.iznosi.length > 0 && (
          <Section icon={<ICoins size={15} />} title="Iznosi" count={result.iznosi.length}>
            {result.iznosi.map((a, i) => (
              <div key={i} className="rrow">
                <div className="rrow-line">
                  <span>{a.opis}</span>
                  <span className="amount-val">{a.iznos} {a.valuta ?? ""}</span>
                </div>
                <Src izvor={a.izvor} />
              </div>
            ))}
          </Section>
        )}

        {result.prava.length > 0 && (
          <Section icon={<IFlag size={15} />} title="Prava" count={result.prava.length}>
            {result.prava.map((p, i) => (
              <div key={i} className="rrow">
                <div>
                  {p.strana && <span className="mini-chip">{p.strana}</span>}
                  {p.opis}
                </div>
                <Src izvor={p.izvor} />
              </div>
            ))}
          </Section>
        )}

        {hasLaw && (
          <Section icon={<IScale size={15} />} title="Pravo, nadležnost i prestanak">
            <div className="defs">
              {result.mjerodavnoPravo?.pravo && (
                <div className="def">
                  <div className="def-l">Mjerodavno pravo</div>
                  <div className="def-v">{result.mjerodavnoPravo.pravo}</div>
                  <Src izvor={result.mjerodavnoPravo.izvor} />
                </div>
              )}
              {result.nadleznost?.opis && (
                <div className="def">
                  <div className="def-l">Nadležnost</div>
                  <div className="def-v">{result.nadleznost.opis}</div>
                  <Src izvor={result.nadleznost.izvor} />
                </div>
              )}
              {result.prestanak?.opis && (
                <div className="def">
                  <div className="def-l">Prestanak / otkaz</div>
                  <div className="def-v">
                    {result.prestanak.opis}
                    {result.prestanak.otkazniRok ? ` (otkazni rok: ${result.prestanak.otkazniRok})` : ""}
                  </div>
                  <Src izvor={result.prestanak.izvor} />
                </div>
              )}
            </div>
          </Section>
        )}

        {result.odredbePoClancima.length > 0 && (
          <Section icon={<IDocs size={15} />} title="Najvažnije odredbe" count={result.odredbePoClancima.length} full>
            {result.odredbePoClancima.map((c, i) => (
              <div key={i} className="rrow">
                <div style={{ fontWeight: 600, color: "var(--navy)" }}>{c.naslov}</div>
                <div className="rrow-sub">{c.sazetak}</div>
                <Src izvor={c.izvor} />
              </div>
            ))}
          </Section>
        )}

        {result.reference.length > 0 && (
          <Section icon={<IBook size={15} />} title="Reference (propisi)" count={result.reference.length}>
            {result.reference.map((r, i) => (
              <div key={i} className="rrow">
                <div>{r.propis}</div>
                <Src izvor={r.izvor} />
              </div>
            ))}
          </Section>
        )}

        {result.napomene.length > 0 && (
          <Section icon={<IAlert size={15} />} title="Napomene" count={result.napomene.length}>
            {result.napomene.map((n, i) => (
              <div key={i} className="rrow">
                <div>{n.opis}</div>
                <Src izvor={n.izvor} />
              </div>
            ))}
          </Section>
        )}
      </div>
    </div>
  );
}
