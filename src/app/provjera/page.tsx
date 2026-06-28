import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { IShield } from "@/components/Icons";

export const dynamic = "force-dynamic";

export default function ReviewPage() {
  return (
    <>
      <PageHeader
        title="Provjera ugovora"
        subtitle="Pregled rizika prema standardima ureda"
      />
      <div className="content">
        <div className="card card-pad" style={{ textAlign: "center", padding: "56px 24px" }}>
          <IShield size={30} color="var(--gold)" />
          <p style={{ fontWeight: 700, color: "var(--navy)", margin: "14px 0 4px", fontSize: 16 }}>
            Značajka u pripremi
          </p>
          <p className="muted" style={{ fontSize: 13, maxWidth: 460, margin: "0 auto" }}>
            Automatski pregled ugovora prema standardima ureda (nalazi rizika vezani uz pojedine
            klauzule) gradi se kao sljedeća značajka. Trenutačno je aktivna <b>analiza dokumenata</b> —
            učitajte dokument i Claude će izdvojiti sve podatke s navedenim izvorom.
          </p>
          <div style={{ marginTop: 18 }}>
            <Link href="/dokumenti" className="btn btn-primary btn-sm">Idi na dokumente</Link>
          </div>
        </div>
      </div>
    </>
  );
}
