import type { Request, Response } from "express";

export interface ProxyRequestConfig {
  serviceName: string;
  baseUrl: string;
  timeoutMs?: number;
  path?: string;
  method?: "GET" | "POST" | "PATCH";
  payload?: unknown;
}

type ProxyRequestBody = Exclude<RequestInit["body"], null | undefined>;

function createForwardHeaders(req: Request): Headers {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (!value || key === "host" || key === "content-length" || key === "x-tenant-id") {
      continue;
    }

    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }

  return headers;
}

export function resolveProxyRequestBody(
  method: string,
  body: unknown,
  payload?: unknown
): ProxyRequestBody | null {
  if (method === "GET" || method === "HEAD") {
    return null;
  }

  const source = payload ?? body;

  if (source === null || source === undefined) {
    return null;
  }

  if (
    typeof source === "string" ||
    source instanceof ArrayBuffer ||
    source instanceof URLSearchParams
  ) {
    return source;
  }

  if (ArrayBuffer.isView(source)) {
    return source as ProxyRequestBody;
  }

  return JSON.stringify(source);
}

export async function proxyRequest(req: Request, config: ProxyRequestConfig) {
  const timeoutMs = config.timeoutMs ?? 5_000;
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);
  try {
    const body = resolveProxyRequestBody(config.method ?? "GET", null, config.payload);
    const requestInit: RequestInit = {
      headers: createForwardHeaders(req),
      method: config.method ?? "GET",
      signal: abortController.signal
    };

    if (body !== null) {
      requestInit.body = body;
    }

    const response = await fetch(`${config.baseUrl}${config.path ?? req.originalUrl}`, requestInit);
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function proxyExpressRequest(
  req: Request,
  res: Response,
  config: ProxyRequestConfig
) {
  const timeoutMs = config.timeoutMs ?? 10_000;
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);

  try {
    const requestInit: RequestInit = {
      headers: createForwardHeaders(req),
      method: config.method ?? req.method,
      signal: abortController.signal
    };
    const body = resolveProxyRequestBody(config.method ?? req.method, req.body, config.payload);

    if (body !== null) {
      requestInit.body = body;
    }

    const upstreamResponse = await fetch(
      `${config.baseUrl}${config.path ?? req.originalUrl}`,
      requestInit
    );
    const headerBag = upstreamResponse.headers as Headers & {
      getSetCookie?: () => string[];
    };
    const setCookies =
      typeof headerBag.getSetCookie === "function" ? headerBag.getSetCookie() : [];

    upstreamResponse.headers.forEach((value, key) => {
      if (key === "content-length" || key === "transfer-encoding" || key === "set-cookie") {
        return;
      }

      res.setHeader(key, value);
    });

    for (const cookie of setCookies) {
      res.append("set-cookie", cookie);
    }

    res.status(upstreamResponse.status).send(await upstreamResponse.text());
  } finally {
    clearTimeout(timeout);
  }
}
