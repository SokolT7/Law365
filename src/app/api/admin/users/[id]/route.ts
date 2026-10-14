import { apiError, ensureSameOrigin, invitationUrl, privateJson, readJsonObject, requirePlatformAdmin } from "@/lib/auth";
import { updateUser } from "@/lib/platform";

export const runtime = "nodejs";
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    ensureSameOrigin(request); const { user: actor } = await requirePlatformAdmin();
    const { id } = await context.params; const input = await readJsonObject(request);
    const result = updateUser(id, input as Parameters<typeof updateUser>[1], actor.id);
    return privateJson({ user: result.user, ...("token" in result && typeof result.token === "string" ? { invitationUrl: invitationUrl(request, result.token), expiresAt: result.expiresAt } : {}) });
  } catch (error) { return apiError(error); }
}
