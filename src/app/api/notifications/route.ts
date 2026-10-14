import { NextResponse } from "next/server";
import { AccessError, requireSession } from "@/lib/auth";
import { apiRoute } from "@/lib/api-access";
import { readWorkspaceDB } from "@/lib/db";
import { workspaceNotifications } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = apiRoute(null, async () => {
  const session = await requireSession();
  if (!session.firm || session.user.role === "platform_admin") throw new AccessError(403, "Obavijesti su dostupne u radnom prostoru ureda.");
  // readWorkspaceDB applies the same module visibility as the pages.
  return NextResponse.json({ notifications: workspaceNotifications(await readWorkspaceDB(), session.firm) });
});
