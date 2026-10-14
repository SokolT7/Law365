"use client";

import { useEffect, useState } from "react";
import { ISearch } from "@/components/Icons";
import { useWorkspace } from "@/components/shell/WorkspaceContext";

export default function SearchTrigger() {
  const workspace = useWorkspace();
  const [mac, setMac] = useState(true);
  useEffect(() => { setMac(/Mac|iPhone|iPad/.test(navigator.platform)); }, []);
  if (!workspace) return null;
  return <button type="button" className="search-trigger" onClick={workspace.openPalette} aria-keyshortcuts={mac ? "Meta+K" : "Control+K"}>
    <ISearch aria-hidden="true" /><span>Pretraži ili skoči…</span><kbd>{mac ? "⌘K" : "Ctrl K"}</kbd>
  </button>;
}

/** A button that opens the global upload dialog, optionally pre-scoped. */
export function UploadButton({ children = "Učitaj dokument", clientId, contract, variant = "primary" }: { children?: React.ReactNode; clientId?: string; contract?: boolean; variant?: "primary" | "secondary" }) {
  const workspace = useWorkspace();
  if (!workspace?.canUpload) return null;
  return <button type="button" className={`btn btn-${variant} btn-md`} onClick={() => workspace.openUpload({ clientId, contract })}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M5 20h14" /></svg>
    {children}
  </button>;
}
