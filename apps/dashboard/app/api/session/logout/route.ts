import { NextResponse } from "next/server";

function resolveApiBaseUrl(): string {
  return process.env.API_URL?.trim() || "http://localhost:3000";
}

function appendSetCookies(target: NextResponse, source: Response): void {
  const headerBag = source.headers as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies = typeof headerBag.getSetCookie === "function" ? headerBag.getSetCookie() : [];

  for (const cookie of cookies) {
    target.headers.append("set-cookie", cookie);
  }
}

function readCookieValue(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) {
    return null;
  }

  const prefixedName = `${name}=`;
  const cookie = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(prefixedName));

  return cookie ? decodeURIComponent(cookie.slice(prefixedName.length)) : null;
}

function parseJsonBody(body: string, fallback: Record<string, unknown>) {
  if (body.trim().length === 0) {
    return fallback;
  }

  try {
    return JSON.parse(body) as Record<string, unknown>;
  } catch {
    return {
      ...fallback,
      detail: body
    };
  }
}

export async function POST(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  const csrfToken = readCookieValue(cookieHeader, "bh360_csrf");
  const backendResponse = await fetch(`${resolveApiBaseUrl()}/api/v1/auth/logout`, {
    cache: "no-store",
    headers: {
      ...(cookieHeader ? { cookie: cookieHeader } : {}),
      ...(csrfToken ? { "x-csrf-token": csrfToken } : {})
    },
    method: "POST"
  });

  const responseBody = await backendResponse.text();
  const parsedBody = parseJsonBody(responseBody, { ok: backendResponse.ok });
  const response = NextResponse.json(parsedBody, {
    status: backendResponse.status
  });

  appendSetCookies(response, backendResponse);
  return response;
}
