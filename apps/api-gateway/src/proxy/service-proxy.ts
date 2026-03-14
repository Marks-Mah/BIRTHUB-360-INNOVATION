import type { Request } from "express";

export interface ProxyRequestConfig {
  serviceName: string;
  baseUrl: string;
  timeoutMs?: number;
  path: string;
  method?: "GET" | "POST" | "PATCH";
  payload?: unknown;
}

export async function proxyRequest(req: Request, config: ProxyRequestConfig) {
  const timeoutMs = config.timeoutMs ?? 5_000;
  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), timeoutMs);
  try {
    const response = await fetch(`${config.baseUrl}${config.path}`, {
      method: config.method ?? "GET",
      body: config.payload ? JSON.stringify(config.payload) : undefined,
      signal: abortController.signal,
      headers: {
        "content-type": "application/json",
        "x-tenant-id": req.header("x-tenant-id") ?? "unknown",
      },
    });
    return response.json();
  } finally {
    clearTimeout(timeout);
  }
}
