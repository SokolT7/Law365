"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ICheck, IX } from "@/components/Icons";
import type { FindingStatus } from "@/lib/types";

export default function FindingActions({
  findingId,
  status,
}: {
  findingId: string;
  status: FindingStatus;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "odobri" | "odbaci") {
    setBusy(true);
    await fetch(`/api/review/${findingId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    router.refresh();
    setBusy(false);
  }

  if (status !== "otvoren") {
    return (
      <span className={`badge ${status}`}>
        {status === "odobren" ? "Odobreno" : "Odbačeno"}
      </span>
    );
  }

  return (
    <div className="flex">
      <button className="btn btn-sm btn-primary" disabled={busy} onClick={() => act("odobri")}>
        <ICheck size={14} /> Odobri
      </button>
      <button className="btn btn-sm" disabled={busy} onClick={() => act("odbaci")}>
        <IX size={14} /> Odbaci
      </button>
    </div>
  );
}
