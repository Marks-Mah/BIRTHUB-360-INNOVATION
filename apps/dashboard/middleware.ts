import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSessionToken } from "./lib/auth/session-token";

const PUBLIC_PATHS = ["/login", "/api/session/login", "/api/session/logout", "/_next", "/favicon.ico"];

export function middleware(request: NextRequest) {
  if (PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (isValidSessionToken(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
