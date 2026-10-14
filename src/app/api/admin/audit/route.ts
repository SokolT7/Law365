import { apiError, privateJson, requirePlatformAdmin } from "@/lib/auth";
import { listPlatformAudit } from "@/lib/platform";

export const runtime = "nodejs";
export async function GET() {
  try { await requirePlatformAdmin(); return privateJson({ events: listPlatformAudit() }); }
  catch (error) { return apiError(error); }
}
