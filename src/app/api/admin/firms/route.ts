import { apiError, ensureSameOrigin, privateJson, readJsonObject, requirePlatformAdmin } from "@/lib/auth";
import { createFirm, listFirms, type FirmInput } from "@/lib/platform";

export const runtime = "nodejs";
export async function GET() {
  try { await requirePlatformAdmin(); return privateJson({ firms: listFirms() }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    ensureSameOrigin(request); const { user } = await requirePlatformAdmin();
    const input = await readJsonObject(request);
    return privateJson({ firm: createFirm(input as FirmInput, user.id) }, 201);
  } catch (error) { return apiError(error); }
}
