import { isIP } from "node:net";

import { z } from "zod";

import { BaseTool, type BaseToolOptions, type ToolExecutionContext } from "./baseTool.js";

const httpInputSchema = z
  .object({
    body: z.unknown().optional(),
    headers: z.record(z.string(), z.string()).default({}),
    method: z.enum(["DELETE", "GET", "PATCH", "POST", "PUT"]).default("GET"),
    query: z.record(z.string(), z.string()).default({}),
    retries: z.number().int().min(0).max(5).default(2),
    timeoutMs: z.number().int().positive().max(120_000).optional(),
    url: z.string().url()
  })
  .strict();

const httpOutputSchema = z
  .object({
    attempt: z.number().int().positive(),
    body: z.unknown(),
    headers: z.record(z.string(), z.string()),
    status: z.number().int()
  })
  .strict();

export type HttpToolInput = z.infer<typeof httpInputSchema>;
export type HttpToolOutput = z.infer<typeof httpOutputSchema>;

export interface HttpToolOptions extends BaseToolOptions {
  allowlistByTenant?: Record<string, string[]>;
  fetchImpl?: typeof fetch;
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isPrivateIpAddress(hostname: string): boolean {
  if (isIP(hostname) === 0) {
    return false;
  }

  return (
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.startsWith("10.") ||
    hostname.startsWith("127.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname) ||
    hostname.startsWith("fc") ||
    hostname.startsWith("fd")
  );
}

function isBlockedHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return (
    normalized === "localhost" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized === "0.0.0.0" ||
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    isPrivateIpAddress(normalized)
  );
}

function hostAllowed(hostname: string, allowlist: readonly string[]): boolean {
  if (allowlist.length === 0) {
    return true;
  }

  const normalized = hostname.toLowerCase();
  return allowlist.some((domain) => {
    const normalizedDomain = domain.toLowerCase();
    return normalized === normalizedDomain || normalized.endsWith(`.${normalizedDomain}`);
  });
}

export class HttpTool extends BaseTool<HttpToolInput, HttpToolOutput> {
  private readonly allowlistByTenant: Record<string, string[]>;
  private readonly fetchImpl: typeof fetch;

  constructor(options: HttpToolOptions = {}) {
    super(
      {
        description: "HTTP request tool with timeout, retries and allowlist enforcement.",
        inputSchema: httpInputSchema,
        name: "http",
        outputSchema: httpOutputSchema,
        timeoutMs: 30_000
      },
      options
    );

    this.allowlistByTenant = options.allowlistByTenant ?? {};
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  protected async execute(input: HttpToolInput, context: ToolExecutionContext): Promise<HttpToolOutput> {
    const url = new URL(input.url);
    Object.entries(input.query).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });

    if (isBlockedHost(url.hostname)) {
      throw new Error(`HTTP tool blocked host '${url.hostname}' to prevent SSRF.`);
    }

    const allowlist = context.allowlistedDomains ?? this.allowlistByTenant[context.tenantId] ?? [];
    if (!hostAllowed(url.hostname, allowlist)) {
      throw new Error(`HTTP tool blocked domain '${url.hostname}' because it is outside tenant allowlist.`);
    }

    const totalAttempts = input.retries + 1;
    const requestBody =
      input.body === undefined ? undefined : typeof input.body === "string" ? input.body : JSON.stringify(input.body);

    for (let attempt = 1; attempt <= totalAttempts; attempt += 1) {
      try {
        const requestInit: RequestInit = {
          headers: input.headers,
          method: input.method,
          signal: AbortSignal.timeout(input.timeoutMs ?? this.timeoutMs)
        };

        if (requestBody !== undefined) {
          requestInit.body = requestBody;
        }

        const response = await this.fetchImpl(url, {
          ...requestInit
        });

        const contentType = response.headers.get("content-type") ?? "";
        const responseBody =
          contentType.includes("application/json") ? await response.json() : await response.text();
        const responseHeaders: Record<string, string> = {};
        response.headers.forEach((value, key) => {
          responseHeaders[key] = value;
        });

        return {
          attempt,
          body: responseBody,
          headers: responseHeaders,
          status: response.status
        };
      } catch (error) {
        if (attempt >= totalAttempts) {
          throw error;
        }

        const jitter = Math.floor(Math.random() * 120);
        await sleep(200 * attempt + jitter);
      }
    }

    throw new Error("Unexpected HTTP tool retry flow.");
  }
}
