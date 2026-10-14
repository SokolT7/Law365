import { NextResponse } from "next/server";
import { AccessError, readJsonObject, requireFeature } from "@/lib/auth";
import { apiRoute } from "@/lib/api-access";
import { readDB } from "@/lib/db";
import { SCOPE_COOKIE } from "@/lib/scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sets (clientId) or clears (null) the workspace client scope for this browser session. */
export const POST = apiRoute("clients", async (req: Request) => {
  await requireFeature("clients");
  const { clientId } = (await readJsonObject(req, 2_000)) as { clientId?: unknown };
  const response = NextResponse.json({ ok: true });
  if (clientId === null || clientId === "") {
    response.cookies.set(SCOPE_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0, secure: process.env.NODE_ENV === "production" });
    return response;
  }
  const db = await readDB();
  if (typeof clientId !== "string" || !db.clients.some((c) => c.id === clientId)) throw new AccessError(400, "Klijent nije dostupan.");
  response.cookies.set(SCOPE_COOKIE, clientId, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30, secure: process.env.NODE_ENV === "production" });
  return response;
});
