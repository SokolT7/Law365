import Link from "next/link";
import { readDB } from "@/lib/db";
import { PageHeader, TenantBanner } from "@/components/ui";
import AskChat from "@/components/AskChat";
import { allSourceItems, defaultSources } from "@/lib/sources";

export const dynamic = "force-dynamic";

export default async function AskPage() {
  const db = await readDB();
  const sources = db.settings?.sources ?? defaultSources();
  const enabled = allSourceItems().filter((s) => sources[s.id]);

  return (
    <>
      <PageHeader
        title="Pitanja i odgovori"
        subtitle="Razgovarajte s dokumentima i izvorima prava — svaki odgovor navodi izvor"
      />
      <div className="content">
        <TenantBanner />
        <div className="src-chips">
          <span className="lab">Aktivni izvori</span>
          {enabled.length === 0 && (
            <span className="muted" style={{ fontSize: 12 }}>nijedan izvor nije uključen</span>
          )}
          {enabled.slice(0, 6).map((s) => (
            <span key={s.id} className="schip">
              <span className="dot" />
              {s.name.replace(/\s*\(.*\)$/, "")}
            </span>
          ))}
          <Link href="/izvori" className="manage">Upravljaj izvorima →</Link>
        </div>
        <AskChat />
      </div>
    </>
  );
}
