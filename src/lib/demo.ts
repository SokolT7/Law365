import { listFirms, listUsers } from "@/lib/platform";

/**
 * One-click demo sign-in. Enabled only by `LTB_DEMO_MODE=1` (set by scripts/start-demo.mjs)
 * and never in production builds, so a real deployment cannot expose passwordless access.
 */
export function isDemoMode(): boolean {
  return process.env.LTB_DEMO_MODE === "1" && process.env.NODE_ENV !== "production";
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
