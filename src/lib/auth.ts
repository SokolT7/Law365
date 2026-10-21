import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { AccessError, createSession, resolveSession, SESSION_MAX_AGE, type Session } from "./platform";
import { hasFeature, type FeatureKey } from "./features";
import { DEMO_AUTH_COOKIE, demoAuthCookie, demoCookieSession } from "./demo";
import { isPublicDemo } from "./public-demo";

export { AccessError, hasFeature };
export type { Session };
export const SESSION_COOKIE = "ltb_session";

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  if (isPublicDemo()) return demoCookieSession(jar.get(DEMO_AUTH_COOKIE)?.value);
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? resolveSession(token) : null;
}
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new AccessError(401, "Prijavite se za pristup radnom prostoru.");
  return session;
}
export async function requirePlatformAdmin(): Promise<Session> {
  const session = await requireSession();
  if (session.user.role !== "platform_admin") throw new AccessError(403, "Pristup je dopušten samo LTB administratoru.");
  return session;
}
export async function requireFeature(key: FeatureKey): Promise<Session & { firm: NonNullable<Session["firm"]> }> {
  const session = await requireSession();
  if (!session.firm || session.user.role === "platform_admin" || !hasFeature(session.firm, key)) {
    throw new AccessError(403, "Ova funkcija nije dostupna vašem uredu.");
  }
  return session as Session & { firm: NonNullable<Session["firm"]> };
}

/** Cookie-authenticated mutations accept only the configured/request origin. */
export function ensureSameOrigin(request: Request): void {
  const supplied = request.headers.get("origin");
  const expected = process.env.LTB_APP_URL ? new URL(process.env.LTB_APP_URL).origin : new URL(request.url).origin;
  if (!supplied || supplied !== expected || request.headers.get("sec-fetch-site") === "cross-site") {
    throw new AccessError(403, "Zahtjev nije dopušten. Osvježite stranicu i pokušajte ponovno.");
  }
}
export function apiError(error: unknown): NextResponse {
  if (error instanceof AccessError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store", ...(error.status === 429 ? { "Retry-After": "900" } : {}) } });
  if (error instanceof SyntaxError) return NextResponse.json({ error: "Neispravan format zahtjeva." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  console.error("LTB request failed:", error instanceof Error ? error.name : "unknown error");
  return NextResponse.json({ error: "Zahtjev nije uspio. Pokušajte ponovno." }, { status: 500, headers: { "Cache-Control": "no-store" } });
}
export function privateJson(value: unknown, status = 200): NextResponse {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}
export function withSessionCookie(response: NextResponse, userId: string): NextResponse {
  if (isPublicDemo()) {
    const { value, maxAge } = demoAuthCookie(userId);
    response.cookies.set(DEMO_AUTH_COOKIE, value, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge });
    return response;
  }
  response.cookies.set(SESSION_COOKIE, createSession(userId), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: SESSION_MAX_AGE });
  return response;
}
export async function readJsonObject(request: Request, maxBytes = 20_000): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length") || 0);
  if (length > maxBytes) throw new AccessError(413, "Zahtjev je prevelik.");
  const reader = request.body?.getReader();
  if (!reader) throw new AccessError(400, "Zahtjev je prazan.");
  const decoder = new TextDecoder();
  let size = 0; let body = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new AccessError(413, "Zahtjev je prevelik."); }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
  } finally { reader.releaseLock(); }
  const value = JSON.parse(body);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AccessError(400, "Neispravan zahtjev.");
  return value;
}
export function invitationUrl(request: Request, token: string): string {
  const base = process.env.LTB_APP_URL ? new URL(process.env.LTB_APP_URL).origin : new URL(request.url).origin;
  return `${base}/poziv?token=${encodeURIComponent(token)}`;
}
