import { cookies } from "next/headers";
import type { DB } from "@/lib/types";

export const SCOPE_COOKIE = "ltb_klijent";
const INTERNAL_CLIENT = "Ručno učitani dokument";

/** The client the user has scoped the workspace to (validated against the firm's own clients), if any. */
export async function activeClientScope(db: Pick<DB, "clients">): Promise<{ id: string; name: string } | null> {
  const id = (await cookies()).get(SCOPE_COOKIE)?.value;
  if (!id) return null;
  const client = db.clients.find((c) => c.id === id && c.name !== INTERNAL_CLIENT);
  return client ? { id: client.id, name: client.name } : null;
}
