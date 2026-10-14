import Link from "next/link";
import AuthFrame from "@/components/auth/AuthFrame";
import AuthForm from "@/components/auth/AuthForm";
import { getInvitationStatus } from "@/lib/platform";

export const dynamic = "force-dynamic";

export default async function InvitationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) {
    return <AuthFrame><div className="auth-content"><p className="auth-kicker">Aktivacija računa</p><h2 className="auth-title">Pozivnica nije potpuna.</h2><p className="auth-description">Otvorite cijelu poveznicu koju ste dobili od LTB administratora. Ako je nemate, zatražite novu pozivnicu.</p><Link className="btn" href="/prijava">Povratak na prijavu</Link></div></AuthFrame>;
  }
  const invitation = getInvitationStatus(token);
  if (!invitation) return <AuthFrame><div className="auth-content"><p className="auth-kicker">Aktivacija računa</p><h2 className="auth-title">Ova pozivnica više nije važeća.</h2><p className="auth-description">Pozivnica je istekla, opozvana ili već iskorištena. Za novu poveznicu obratite se svojoj kontakt-osobi u LTB timu.</p><Link className="btn" href="/prijava">Povratak na prijavu</Link></div></AuthFrame>;
  return <AuthFrame><div className="auth-invitation-context"><strong>{invitation.firmName || "LTB Law"}</strong><span>{invitation.email}</span></div><AuthForm token={token} /></AuthFrame>;
}
