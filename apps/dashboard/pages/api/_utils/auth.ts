import type { NextApiRequest } from "next";

function resolveApiBaseUrl(): string {
  return process.env.API_URL?.trim() || "http://localhost:3000";
}

function readFirst(header: string | string[] | undefined): string | null {
  if (Array.isArray(header)) {
    return header[0] ?? null;
  }

  return typeof header === "string" && header.trim().length > 0 ? header : null;
}

export function buildApiForwardHeaders(req: NextApiRequest): Headers {
  const headers = new Headers();
  const authorization = readFirst(req.headers.authorization);
  const cookieHeader = readFirst(req.headers.cookie);

  if (authorization) {
    headers.set("authorization", authorization);
  }

  if (cookieHeader) {
    headers.set("cookie", cookieHeader);
  }

  return headers;
}

export async function requireApiAuth(
  req: NextApiRequest
): Promise<{ forwardHeaders: Headers; profile: unknown }> {
  const forwardHeaders = buildApiForwardHeaders(req);

  if (!forwardHeaders.get("authorization") && !forwardHeaders.get("cookie")) {
    throw new Error("missing_authorization");
  }

  const response = await fetch(`${resolveApiBaseUrl()}/api/v1/me`, {
    cache: "no-store",
    headers: forwardHeaders
  });

  if (!response.ok) {
    throw new Error(`backend_error_${response.status}`);
  }

  return {
    forwardHeaders,
    profile: await response.json()
  };
}

export async function proxyJson(path: string, req: NextApiRequest, init?: RequestInit) {
  const { forwardHeaders } = await requireApiAuth(req);
  const headers = new Headers(forwardHeaders);

  if (init?.headers) {
    const extraHeaders = new Headers(init.headers);
    extraHeaders.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  const response = await fetch(`${resolveApiBaseUrl()}${path}`, {
    ...init,
    cache: "no-store",
    headers
  });

  if (!response.ok) {
    throw new Error(`backend_error_${response.status}`);
  }

  return response.json();
}
