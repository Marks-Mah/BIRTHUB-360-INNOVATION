import { NextRequest, NextResponse } from "next/server";

import { getWebConfig } from "@birthub/config";

const webConfig = getWebConfig();

async function proxyApi(
  request: NextRequest,
  path: string,
  init: RequestInit
): Promise<NextResponse> {
  const response = await fetch(`${webConfig.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? ""
    }
  });
  const responseBody = await response.text();
  const nextResponse = new NextResponse(responseBody, {
    status: response.status
  });
  const setCookie = response.headers.get("set-cookie");

  if (setCookie) {
    nextResponse.headers.set("set-cookie", setCookie);
  }

  return nextResponse;
}

// @see ADR-010 (Auth boundary): this route centralizes auth entrypoints for the web app while
// user/session persistence remains in Prisma-managed records handled by the API.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
): Promise<NextResponse> {
  const params = await context.params;
  const action = params.nextauth?.[0];

  if (action === "signin") {
    const body = await request.json();
    return proxyApi(request, "/api/v1/auth/login", {
      body: JSON.stringify(body),
      method: "POST"
    });
  }

  if (action === "signout") {
    return proxyApi(request, "/api/v1/auth/logout", {
      method: "POST"
    });
  }

  if (action === "refresh") {
    const body = await request.json();
    return proxyApi(request, "/api/v1/auth/refresh", {
      body: JSON.stringify(body),
      method: "POST"
    });
  }

  if (action === "mfa") {
    const body = await request.json();
    return proxyApi(request, "/api/v1/auth/mfa/challenge", {
      body: JSON.stringify(body),
      method: "POST"
    });
  }

  return NextResponse.json(
    {
      error: "Unsupported auth action."
    },
    {
      status: 404
    }
  );
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ nextauth: string[] }> }
): Promise<NextResponse> {
  const params = await context.params;
  const action = params.nextauth?.[0];

  if (action === "session") {
    return proxyApi(request, "/api/v1/sessions", {
      headers: {
        authorization: request.headers.get("authorization") ?? "",
        "x-tenant-id": request.headers.get("x-tenant-id") ?? ""
      },
      method: "GET"
    });
  }

  return NextResponse.json(
    {
      error: "Unsupported auth action."
    },
    {
      status: 404
    }
  );
}
