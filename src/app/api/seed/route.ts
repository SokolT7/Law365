import { NextResponse } from "next/server";
import { resetDB } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  resetDB();
  return NextResponse.json({ ok: true });
}
