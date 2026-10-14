import { redirect } from "next/navigation";
import AuthFrame from "@/components/auth/AuthFrame";
import AuthForm from "@/components/auth/AuthForm";
import DemoLogin from "@/components/auth/DemoLogin";
import { getSession } from "@/lib/auth";
import { hasPlatformAdmin } from "@/lib/platform";
import { demoChoices } from "@/lib/demo";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ aktivacija?: string }> }) {
  const session = await getSession();
  if (session) redirect(session.user.role === "platform_admin" ? "/admin" : "/");
  const demo = demoChoices();
  if (demo) return <AuthFrame><DemoLogin firm={demo.firm} admin={demo.admin} /></AuthFrame>;
  const configured = hasPlatformAdmin();
  const { aktivacija } = await searchParams;
  return <AuthFrame><AuthForm configured={configured} awaitingActivation={aktivacija === "cekanje"} /></AuthFrame>;
}
