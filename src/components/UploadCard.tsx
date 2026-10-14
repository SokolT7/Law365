"use client";

import { useState } from "react";
import { IUpload } from "@/components/Icons";
import { useWorkspace } from "@/components/shell/WorkspaceContext";

/** Contextual drop target; the shared upload dialog handles validation, client and progress. */
export default function UploadCard({
  fixedClientId,
  kind = "choice",
  heading,
}: {
  clients?: { id: string; name: string }[];
  /** Preselected client (e.g. on a client page). */
  fixedClientId?: string;
  /** "ugovor" continues straight to the contract review. */
  kind?: "choice" | "ugovor";
  redirect?: "workspace" | "provjera";
  heading?: string;
}) {
  const workspace = useWorkspace();
  const [over, setOver] = useState(false);
  if (!workspace?.canUpload) return null;
  const open = (files?: File[]) => workspace.openUpload({ files, clientId: fixedClientId, contract: kind === "ugovor" });

  return (
    <div className="card card-pad">
      {heading && <h3 className="upload-heading">{heading}</h3>}
      <button type="button" className={`drop${over ? " over" : ""}`}
        onClick={() => open()}
        onDragOver={(event) => { event.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => { event.preventDefault(); setOver(false); if (event.dataTransfer.files?.length) open(Array.from(event.dataTransfer.files)); }}>
        <span className="drop-icon"><IUpload size={20} aria-hidden="true" /></span>
        <p>{kind === "ugovor" ? "Učitajte ugovor" : "Učitajte dokument"}</p>
        <small>Ispustite datoteke ili kliknite · PDF, DOCX, TXT, MD</small>
      </button>
    </div>
  );
}
