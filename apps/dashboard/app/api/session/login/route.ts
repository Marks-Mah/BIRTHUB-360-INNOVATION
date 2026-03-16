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
  const payload = (await request.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    tenantId?: string;
  };

  if (!payload.email || !payload.password || !payload.tenantId) {
    return NextResponse.json(
      { ok: false, error: "email, password and tenantId are required" },
      { status: 400 }
    );
  }

  const backendResponse = await fetch(`${resolveApiBaseUrl()}/api/v1/auth/login`, {
    body: JSON.stringify(payload),
    cache: "no-store",
    headers: {
      "content-type": "application/json"
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
