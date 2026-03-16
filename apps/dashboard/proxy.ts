import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/api/session/login", "/api/session/logout", "/_next", "/favicon.ico"];

function resolveApiBaseUrl(): string {
  return process.env.API_URL?.trim() || "http://localhost:3000";
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const response = await fetch(`${resolveApiBaseUrl()}/api/v1/me`, {
    cache: "no-store",
    headers: {
      ...(request.headers.get("authorization")
        ? { authorization: request.headers.get("authorization") as string }
        : {}),
      ...(request.headers.get("cookie") ? { cookie: request.headers.get("cookie") as string } : {})
    }
  });

  return response.ok;
}

export async function proxy(request: NextRequest) {
  if (PUBLIC_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    return NextResponse.next();
  }

  if (await isAuthenticated(request)) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
