import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { apiError, ensureSameOrigin, privateJson, SESSION_COOKIE } from "@/lib/auth";
import { DEMO_AUTH_COOKIE } from "@/lib/demo";
import { revokeSession } from "@/lib/platform";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    ensureSameOrigin(request);
    const token = (await cookies()).get(SESSION_COOKIE)?.value;
    if (token) revokeSession(token);
    const response = request.headers.get("accept")?.includes("text/html")
      ? NextResponse.redirect(new URL("/prijava", process.env.LTB_APP_URL || request.url), 303)
      : privateJson({ ok: true });
    response.cookies.set(SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    response.cookies.set(DEMO_AUTH_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  } catch (error) { return apiError(error); }
}
