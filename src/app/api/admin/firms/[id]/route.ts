import { AccessError, apiError, ensureSameOrigin, privateJson, readJsonObject, requirePlatformAdmin } from "@/lib/auth";
import { getFirm, listUsers, updateFirm, type FirmInput } from "@/lib/platform";

export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    await requirePlatformAdmin(); const { id } = await context.params; const firm = getFirm(id);
    if (!firm) throw new AccessError(404, "Ured nije pronađen.");
    return privateJson({ firm, users: listUsers(id) });
  } catch (error) { return apiError(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    ensureSameOrigin(request); const { user } = await requirePlatformAdmin();
    const { id } = await context.params; const input = await readJsonObject(request);
    return privateJson({ firm: updateFirm(id, input as FirmInput, user.id) });
  } catch (error) { return apiError(error); }
}
