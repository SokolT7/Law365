"use client";

import { createContext, useContext } from "react";

export type UploadOptions = {
  /** Preselected client (e.g. on a client page). */
  clientId?: string;
  /** Lock the kind to a contract and continue to the review afterwards. */
  contract?: boolean;
  files?: File[];
};

export type NotificationItem = {
  id: string;
  kind: "analysis" | "error" | "regulation" | "processing";
  title: string;
  sub: string;
  href: string;
  at: string;
};

export type WorkspaceApi = {
  userId: string;
  openUpload: (options?: UploadOptions) => void;
  openPalette: () => void;
  openShortcuts: () => void;
  canUpload: boolean;
};

export const WorkspaceContext = createContext<WorkspaceApi | null>(null);

/** Null outside the firm workspace (admin, auth), so callers can degrade gracefully. */
export function useWorkspace() {
  return useContext(WorkspaceContext);
}
