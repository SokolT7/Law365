import { AccessError, apiError, ensureSameOrigin, privateJson, readJsonObject, requireSession, SESSION_COOKIE } from "@/lib/auth";
import { changePassword } from "@/lib/platform";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    ensureSameOrigin(request); const { user } = await requireSession();
    const { currentPassword, newPassword } = await readJsonObject(request);
    if (typeof currentPassword !== "string" || typeof newPassword !== "string") throw new AccessError(400, "Unesite trenutačnu i novu lozinku.");
    await changePassword(user.id, currentPassword, newPassword);
    const response = privateJson({ ok: true, redirect: "/prijava?lozinka=promijenjena" });
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  } catch (error) { return apiError(error); }
}
