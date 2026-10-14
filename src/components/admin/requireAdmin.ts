import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export async function requireAdminPage() {
  const session = await getSession();
  if (!session) redirect("/prijava");
  if (session.user.role !== "platform_admin") redirect("/");
  return session;
}
