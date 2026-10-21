import { createSession, listFirms, listUsers, resolveSession, type Session } from "@/lib/platform";
import { isPublicDemo } from "@/lib/public-demo";

/**
 * One-click demo sign-in. Enabled by `LTB_DEMO_MODE=1` (set by scripts/start-demo.mjs) outside production
 * builds, or by the public demo, which runs only on bundled sample data.
 */
export function isDemoMode(): boolean {
  return isPublicDemo() || (process.env.LTB_DEMO_MODE === "1" && process.env.NODE_ENV !== "production");
}

let publicToken: string | undefined;
/**
 * Public demo visitors need no sign-in: without a valid cookie they share the demo firm user.
 * Each instance has its own database copy, so a cookie from another instance falls back here too.
 */
export function publicDemoSession(): Session | null {
  if (!isPublicDemo()) return null;
  const existing = publicToken ? resolveSession(publicToken) : null;
  if (existing) return existing;
  const user = demoUser("firm");
  if (!user) return null;
  publicToken = createSession(user.id);
  return resolveSession(publicToken);
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
