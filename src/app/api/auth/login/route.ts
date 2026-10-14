import { AccessError, apiError, ensureSameOrigin, privateJson, readJsonObject, withSessionCookie } from "@/lib/auth";
import { authenticate } from "@/lib/platform";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    const { email, password } = await readJsonObject(request);
    if (typeof email !== "string" || email.length > 254 || typeof password !== "string" || password.length > 256) throw new AccessError(400, "Unesite e-poštu i lozinku.");
    const session = await authenticate(email, password);
    if (!session) throw new AccessError(401, "Prijava nije uspjela. Provjerite podatke ili se obratite LTB administratoru.");
    return withSessionCookie(privateJson({ ok: true, redirect: session.user.role === "platform_admin" ? "/admin" : "/" }), session.user.id);
  } catch (error) { return apiError(error); }
}
