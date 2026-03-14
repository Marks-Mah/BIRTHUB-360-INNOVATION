import type { ApiConfig } from "@birthub/config";
import type { Request, RequestHandler, Response } from "express";
import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";

import { ProblemDetailsError, toProblemDetails } from "../lib/problem-details.js";

function buildHandler(input: {
  detail: string;
  windowMs: number;
}): NonNullable<Options["handler"]> {
  return (request: Request, response: Response, _next, _options) => {
    const retryAfterSeconds = Math.ceil(input.windowMs / 1000);

    response.setHeader("Retry-After", String(retryAfterSeconds));
    response.status(429).json(
      toProblemDetails(
        request,
        new ProblemDetailsError({
          detail: input.detail,
          status: 429,
          title: "Too Many Requests"
        })
      )
    );
  };
}

function resolveIpKey(request: Request): string {
  return ipKeyGenerator(request.ip ?? request.header("x-forwarded-for") ?? "anonymous");
}

export function createRateLimitMiddleware(config: ApiConfig): RequestHandler {
  return rateLimit({
    handler: (request, response, next, options) =>
      buildHandler({
        detail: request.context.apiKeyId
          ? "Too many requests for this API key. Please retry later."
          : "Too many requests from this IP address. Please retry later.",
        windowMs: config.API_RATE_LIMIT_WINDOW_MS
      })(request, response, next, options),
    keyGenerator: (request) =>
      request.context.apiKeyId ? `api-key:${request.context.apiKeyId}` : `ip:${resolveIpKey(request)}`,
    legacyHeaders: false,
    limit: (request) =>
      request.context.apiKeyId ? config.API_KEY_RATE_LIMIT_MAX : config.API_RATE_LIMIT_MAX,
    standardHeaders: true,
    windowMs: config.API_RATE_LIMIT_WINDOW_MS
  });
}

export function createLoginRateLimitMiddleware(config: ApiConfig): RequestHandler {
  return rateLimit({
    handler: buildHandler({
      detail: "Too many login attempts from this IP address. Please retry later.",
      windowMs: config.API_LOGIN_RATE_LIMIT_WINDOW_MS
    }),
    keyGenerator: (request) => `login:${resolveIpKey(request)}`,
    legacyHeaders: false,
    limit: config.API_LOGIN_RATE_LIMIT_MAX,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    windowMs: config.API_LOGIN_RATE_LIMIT_WINDOW_MS
  });
}

export function createWebhookRateLimitMiddleware(config: ApiConfig): RequestHandler {
  return rateLimit({
    handler: buildHandler({
      detail: "Inbound webhook traffic temporarily rate limited for this route.",
      windowMs: config.API_WEBHOOK_RATE_LIMIT_WINDOW_MS
    }),
    keyGenerator: (request) => {
      const tenantId = request.header("x-tenant-id") ?? "public";
      const signature =
        request.header("stripe-signature") ??
        request.header("x-birthhub-signature") ??
        "unsigned";

      return `webhook:${tenantId}:${signature}:${resolveIpKey(request)}`;
    },
    legacyHeaders: false,
    limit: (request) =>
      request.header("x-tenant-id")
        ? config.API_WEBHOOK_RATE_LIMIT_MAX * config.API_WEBHOOK_RATE_LIMIT_TENANT_MULTIPLIER
        : config.API_WEBHOOK_RATE_LIMIT_MAX,
    standardHeaders: true,
    windowMs: config.API_WEBHOOK_RATE_LIMIT_WINDOW_MS
  });
}
