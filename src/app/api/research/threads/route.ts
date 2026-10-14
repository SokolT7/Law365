import { NextResponse } from "next/server";
import { requireFeature } from "@/lib/auth";
import { apiRoute } from "@/lib/api-access";
import { readDB } from "@/lib/db";
import { fold } from "@/lib/legal/text";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The current user's research threads, newest first; `q` searches titles and message text. */
export const GET = apiRoute("legal_questions", async (req: Request) => {
  const session = await requireFeature("legal_questions");
  const q = fold(new URL(req.url).searchParams.get("q")?.trim() ?? "");
  const db = await readDB();
  const threads = (db.research ?? [])
    .filter((t) => t.createdById === session.user.id)
    .filter((t) => !q || fold(`${t.title} ${t.messages.map((m) => m.text).join(" ")}`).includes(q))
    .map((t) => ({ id: t.id, title: t.title, updatedAt: t.updatedAt, messages: t.messages.length }));
  return NextResponse.json({ threads });
});
