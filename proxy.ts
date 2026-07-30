import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16 renamed `middleware` to `proxy`. This runs on every dashboard
// request, so it only does an *optimistic* check for the presence of a session
// cookie -- no database lookup. The authoritative check happens in the dashboard
// layout and in lib/dal.ts, close to the data.
const SESSION_COOKIE = "authjs.session-token";
const SECURE_SESSION_COOKIE = "__Secure-authjs.session-token";

export function proxy(request: NextRequest) {
  const hasSession =
    request.cookies.has(SESSION_COOKIE) ||
    request.cookies.has(SECURE_SESSION_COOKIE);

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/onboarding/:path*"],
};
