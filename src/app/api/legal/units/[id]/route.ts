import { NextResponse } from "next/server";
import { AccessError, requireSession } from "@/lib/auth";
import { apiRoute } from "@/lib/api-access";
import { hasFeature } from "@/lib/features";
import { legalUnit, parseConsolidation } from "@/lib/legal/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Full text of a public-law unit for the in-app evidence panel. Public law only; no firm data. */
export const GET = apiRoute(null, async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireSession();
  if (!session.firm || !(hasFeature(session.firm, "legal_questions") || hasFeature(session.firm, "document_chat"))) throw new AccessError(403, "Izvor nije dostupan.");
  const { id } = await ctx.params;
  const unit = legalUnit(decodeURIComponent(id));
  if (!unit) throw new AccessError(404, "Izvor nije pronađen.");
  const consolidation = parseConsolidation(unit.consolidation);
  return NextResponse.json({
    id: unit.id, kind: unit.kind, title: unit.title, short: unit.short, ref: unit.ref, heading: unit.heading, text: unit.text, url: unit.url,
    ecli: unit.ecli, court: unit.court, decidedAt: unit.decided_at, decisionType: unit.decision_type, keywords: unit.keywords, versionNote: unit.version_note ?? null,
    originalText: unit.original_text ?? null, consolidatedWith: consolidation.applied, pendingAmendments: consolidation.pending, inserted: consolidation.inserted,
  });
});
