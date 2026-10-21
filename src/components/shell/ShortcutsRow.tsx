"use client";

import { IChevronRight, IKeyboard } from "@/components/Icons";
import { useWorkspace } from "@/components/shell/WorkspaceContext";

export default function ShortcutsRow() {
  const workspace = useWorkspace();
  if (!workspace) return null;
  return <button type="button" className="settings-row" onClick={workspace.openShortcuts}>
    <IKeyboard aria-hidden="true" /><span>Prečaci tipkovnice</span><IChevronRight className="settings-chev" aria-hidden="true" />
  </button>;
}
