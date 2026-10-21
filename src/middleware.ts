import { NextResponse, type NextRequest } from "next/server";

const VISITOR_COOKIE = "ltb_demo_visitor";

/** Public demo only: give each visitor an anonymous id so their demo copy is theirs alone. */
export function middleware(request: NextRequest) {
  if (process.env.LTB_PUBLIC_DEMO !== "1" || request.cookies.has(VISITOR_COOKIE)) return NextResponse.next();
  const id = crypto.randomUUID();
  // Pass the id to this very request as well, so the first page already has its own copy.
  request.cookies.set(VISITOR_COOKIE, id);
  const response = NextResponse.next({ request: { headers: request.headers } });
  response.cookies.set(VISITOR_COOKIE, id, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 3 * 24 * 60 * 60 });
  return response;
}

export const config = { matcher: ["/((?!_next/|icon.svg|favicon.ico).*)"] };
