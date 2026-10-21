import { AccessError, readJsonObject, requireFeature } from "@/lib/auth";
import { apiRoute } from "@/lib/api-access";
import { readDB } from "@/lib/db";
import { hasFeature } from "@/lib/features";
import { getMode } from "@/lib/ai/client";
import { draftKind } from "@/lib/drafting/kinds";
import { runDraft } from "@/lib/drafting/engine";
import { sseResponse } from "@/lib/research/sse";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const text = (value: unknown, max: number) => (typeof value === "string" && value.trim().length <= max ? value.trim() : null);

/** Streams a new draft, or a revision of `current` following `instruction`. Nothing is saved here. */
async function handlePOST(req: Request) {
  const session = await requireFeature("documents");
  const body = await readJsonObject(req, 400_000);
  const kind = draftKind(body.kind);
  const brief = text(body.brief, 6000);
  if (!kind || !brief) throw new AccessError(400, "Odaberite vrstu dokumenta i opišite što treba (najviše 6.000 znakova).");
  const current = body.current === undefined ? undefined : text(body.current, 200_000);
  const instruction = body.instruction === undefined ? undefined : text(body.instruction, 2000);
  if (current === null || instruction === null || (current !== undefined) !== Boolean(instruction)) throw new AccessError(400, "Opišite što treba promijeniti (najviše 2.000 znakova).");

  const db = await readDB();
  const clientId = typeof body.clientId === "string" && body.clientId ? body.clientId : undefined;
  const client = clientId ? db.clients.find((c) => c.id === clientId) : undefined;
  if (clientId && (!hasFeature(session.firm, "clients") || !client)) throw new AccessError(400, "Odabrani klijent nije dostupan.");

  return sseResponse(runDraft({
    kind, brief, clientName: client?.name, current, instruction: instruction || undefined,
    sources: db.settings?.sources ?? {}, mode: getMode(), signal: req.signal,
  }));
}

export const POST = apiRoute("documents", handlePOST);
