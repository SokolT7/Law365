import { AccessError, apiError, ensureSameOrigin, privateJson, readJsonObject, withSessionCookie } from "@/lib/auth";
import { acceptInvitation, getFirm } from "@/lib/platform";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    const { token, password } = await readJsonObject(request);
    if (typeof token !== "string" || typeof password !== "string") throw new AccessError(400, "Neispravna pozivnica.");
    const user = await acceptInvitation(token, password);
    const firm = user.firmId ? getFirm(user.firmId) : null;
    if (firm?.status !== "active") return privateJson({ ok: true, redirect: "/prijava?aktivacija=cekanje" });
    return withSessionCookie(privateJson({ ok: true, redirect: "/" }), user.id);
  } catch (error) { return apiError(error); }
}
