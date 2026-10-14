import { NextResponse } from "next/server";
export async function POST() {
  return NextResponse.json({ error: "Resetiranje nije dostupno." }, { status: 404 });
}
