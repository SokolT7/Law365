import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasFeature, type FeatureKey } from "@/lib/features";

export async function workspaceSession(feature?: FeatureKey) {
  const session = await getSession();
  if (!session) redirect("/prijava");
  if (session.user.role === "platform_admin") redirect("/admin");
  if (!session.firm) redirect("/prijava");
  if (feature && !hasFeature(session.firm, feature)) notFound();
  return { ...session, firm: session.firm };
}
