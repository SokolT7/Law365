"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";
import { ICheck } from "@/components/Icons";
import { useToast } from "@/components/Feedback";

async function save(id: string, reviewed: boolean) {
  const response = await fetch("/api/propisi", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, reviewed }) });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error || "Promjena nije spremljena. Pokušajte ponovno.");
  }
}

/** Optimistic review toggle with an undo toast instead of a confirmation. */
export default function RegReviewButton({ id, reviewed }: { id: string; reviewed: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState(reviewed);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !state;
    setState(next); setBusy(true);
    try {
      await save(id, next);
      toast({
        message: next ? "Označeno kao pregledano." : "Vraćeno među nepregledane.",
        action: { label: "Poništi", onClick: () => { setState(!next); save(id, !next).then(() => router.refresh()).catch(() => toast({ tone: "error", message: "Poništavanje nije uspjelo." })); } },
      });
      router.refresh();
      window.dispatchEvent(new Event("ltb:notifications-refresh"));
    } catch (err) {
      setState(!next);
      toast({ tone: "error", message: err instanceof Error ? err.message : "Promjena nije spremljena.", action: { label: "Pokušaj ponovno", onClick: toggle } });
    } finally {
      setBusy(false);
    }
  }

  return <div className="review-action">
    <Button size="sm" variant={state ? "ghost" : "secondary"} icon={state ? undefined : <ICheck />} loading={busy} onClick={toggle}>
      {state ? "Vrati u nepregledano" : "Označi pregledano"}
    </Button>
  </div>;
}
