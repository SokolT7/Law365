import { PageHeader, TenantBanner } from "@/components/ui";
import AskChat from "@/components/AskChat";

export const dynamic = "force-dynamic";

export default function AskPage() {
  return (
    <>
      <PageHeader
        title="Pitanja i odgovori"
        subtitle="Razgovarajte s dokumentima ureda — svaki odgovor navodi izvor"
      />
      <div className="content">
        <TenantBanner />
        <AskChat />
      </div>
    </>
  );
}
