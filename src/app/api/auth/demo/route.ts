import { AccessError, apiError, ensureSameOrigin, privateJson, readJsonObject, withSessionCookie } from "@/lib/auth";
import { demoUser, isDemoMode, type DemoRole } from "@/lib/demo";

export const runtime = "nodejs";

/** Demo-only: signs in as the demo administrator or demo firm user without a password. */
export async function POST(request: Request) {
  try {
    if (!isDemoMode()) throw new AccessError(404, "Nije pronađeno.");
    ensureSameOrigin(request);
    const { role } = await readJsonObject(request);
    if (role !== "admin" && role !== "firm") throw new AccessError(400, "Odaberite način prijave.");
    const user = demoUser(role as DemoRole);
    if (!user) throw new AccessError(409, "Demo račun nije pripremljen. Pokrenite npm run dev ponovno.");
    return withSessionCookie(privateJson({ ok: true, redirect: role === "admin" ? "/admin" : "/" }), user.id);
  } catch (error) { return apiError(error); }
}
