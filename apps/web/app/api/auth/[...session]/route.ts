import { isSupportedSessionAction } from "../session-actions";
import { NextRequest, NextResponse } from "next/server";

import { getWebConfig } from "@birthub/config";

const webConfig = getWebConfig();

async function proxyApi(request: NextRequest, path: string, init: RequestInit): Promise<NextResponse> {
  const response = await fetch(`${webConfig.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      "content-type": "application/json",
      cookie: request.headers.get("cookie") ?? ""
    }
  });

  const responseBody = await response.text();
  const nextResponse = new NextResponse(responseBody, { status: response.status });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) {
    nextResponse.headers.set("set-cookie", setCookie);
  }
  return nextResponse;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ session: string[] }> }
): Promise<NextResponse> {
  const params = await context.params;
  const action = params.session?.[0];
  const body = request.method === "POST" ? await request.text() : "";

  if (!isSupportedSessionAction(action)) {
    return NextResponse.json({ error: "Unsupported auth action." }, { status: 404 });
  }

  if (action === "signin") {
    return proxyApi(request, "/api/v1/auth/login", { body, method: "POST" });
  }

  if (action === "signout") {
    return proxyApi(request, "/api/v1/auth/logout", { method: "POST" });
  }

  if (action === "refresh") {
    return proxyApi(request, "/api/v1/auth/refresh", { body, method: "POST" });
  }

  if (action === "mfa") {
    return proxyApi(request, "/api/v1/auth/mfa/challenge", { body, method: "POST" });
  }

  return NextResponse.json({ error: "Unsupported auth action." }, { status: 404 });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ session: string[] }> }
): Promise<NextResponse> {
  const params = await context.params;
  const action = params.session?.[0];

  if (action === "session") {
    return proxyApi(request, "/api/v1/sessions", {
      headers: { authorization: request.headers.get("authorization") ?? "" },
      method: "GET"
    });
  }

  return NextResponse.json({ error: "Unsupported auth action." }, { status: 404 });
}
