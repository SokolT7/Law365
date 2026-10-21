import { createHmac, timingSafeEqual } from "node:crypto";
import { getFirm, getUser, listFirms, listUsers, type Session } from "@/lib/platform";
import { isPublicDemo } from "@/lib/public-demo";

/**
 * One-click demo sign-in. Enabled only by `LTB_DEMO_MODE=1` (set by scripts/start-demo.mjs)
 * and never in production builds, so a real deployment cannot expose passwordless access.
 */
export function isDemoMode(): boolean {
  return process.env.LTB_DEMO_MODE === "1" && process.env.NODE_ENV !== "production";
}

/* ---------- Public demo sign-in ---------- */
// Serverless functions do not share the sessions table, so the public demo signs a stateless cookie instead.

export const DEMO_AUTH_COOKIE = "ltb_demo_auth";
const DEMO_AUTH_MAX_AGE = 7 * 24 * 60 * 60;

function demoSecret(): string {
  const secret = process.env.LTB_DEMO_SECRET || process.env.KV_REST_API_TOKEN;
  if (!secret) throw new Error("Public demo needs LTB_DEMO_SECRET or a KV store token to sign sessions.");
  return secret;
}
const sign = (payload: string) => createHmac("sha256", demoSecret()).update(payload).digest("base64url");

export function demoAuthCookie(userId: string): { value: string; maxAge: number } {
  const payload = `${userId}.${Date.now() + DEMO_AUTH_MAX_AGE * 1000}`;
  return { value: `${payload}.${sign(payload)}`, maxAge: DEMO_AUTH_MAX_AGE };
}

/** Firm users only: the platform administration would not persist across functions. */
export function demoCookieSession(value: string | undefined): Session | null {
  if (!isPublicDemo() || !value) return null;
  const [userId, expires, signature] = value.split(".");
  if (!userId || !expires || !signature || Number(expires) < Date.now()) return null;
  const expected = Buffer.from(sign(`${userId}.${expires}`)), supplied = Buffer.from(signature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) return null;
  const user = getUser(userId);
  const firm = user?.firmId ? getFirm(user.firmId) : null;
  if (!user || user.status !== "active" || user.role === "platform_admin" || !firm || firm.status !== "active") return null;
  return { user, firm };
}

export const DEMO_ACCOUNTS = { admin: "admin@ltb.demo", firm: "ured@ltb.demo" } as const;
export type DemoRole = keyof typeof DEMO_ACCOUNTS;

export function demoUser(role: DemoRole) {
  if (!isDemoMode()) return null;
  const user = listUsers().find((u) => u.email === DEMO_ACCOUNTS[role] && u.status === "active");
  if (!user) return null;
  if (role === "firm" && listFirms().find((f) => f.id === user.firmId)?.status !== "active") return null;
  return user;
}

/** What the login screen shows: names come from the demo database itself. */
export function demoChoices() {
  if (!isDemoMode()) return null;
  const firmUser = demoUser("firm");
  const adminUser = demoUser("admin");
  if (!firmUser && !adminUser) return null;
  const firm = firmUser ? listFirms().find((f) => f.id === firmUser.firmId) : undefined;
  return {
    admin: adminUser ? { name: adminUser.name } : null,
    firm: firmUser ? { name: firmUser.name, firm: firm?.name ?? "Ured" } : null,
  };
}
