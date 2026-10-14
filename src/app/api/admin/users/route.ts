import { AccessError, apiError, ensureSameOrigin, invitationUrl, privateJson, readJsonObject, requirePlatformAdmin } from "@/lib/auth";
import { inviteUser, listUsers } from "@/lib/platform";

export const runtime = "nodejs";
export async function GET(request: Request) {
  try { await requirePlatformAdmin(); return privateJson({ users: listUsers(new URL(request.url).searchParams.get("firmId") ?? undefined) }); }
  catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try {
    ensureSameOrigin(request); const { user: actor } = await requirePlatformAdmin();
    const input = await readJsonObject(request);
    if (typeof input.firmId !== "string" || typeof input.name !== "string" || typeof input.email !== "string") throw new AccessError(400, "Unesite ured, ime i e-poštu korisnika.");
    const result = inviteUser(input as Parameters<typeof inviteUser>[0], actor.id);
    return privateJson({ user: result.user, invitationUrl: invitationUrl(request, result.token), expiresAt: result.expiresAt }, 201);
  } catch (error) { return apiError(error); }
}
