import { redirect } from "next/navigation";
import AuthFrame from "@/components/auth/AuthFrame";
import AuthForm from "@/components/auth/AuthForm";
import { getSession } from "@/lib/auth";
import { hasPlatformAdmin } from "@/lib/platform";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ aktivacija?: string }> }) {
  const session = await getSession();
  if (session) redirect(session.user.role === "platform_admin" ? "/admin" : "/");
  const configured = hasPlatformAdmin();
  const { aktivacija } = await searchParams;
  return <AuthFrame><AuthForm configured={configured} awaitingActivation={aktivacija === "cekanje"} /></AuthFrame>;
}
