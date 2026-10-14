"use client";
import { useRouter } from "next/navigation";
import { IUsers } from "@/components/Icons";

/** Shows that the page is filtered by the workspace client scope, with a one-click way back. */
export default function ScopeNotice({ scope }: { scope: { id: string; name: string } | null }) {
  const router = useRouter();
  if (!scope) return null;
  return <div className="scope-notice" role="status">
    <IUsers size={16} aria-hidden="true" />
    <span>Prikaz za klijenta <b>{scope.name}</b></span>
    <button type="button" className="link" onClick={async () => { await fetch("/api/scope", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: null }) }); router.refresh(); }}>Prikaži sve klijente</button>
  </div>;
}
