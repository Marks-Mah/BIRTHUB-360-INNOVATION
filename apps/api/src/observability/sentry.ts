
import type { ApiConfig } from "@birthub/config";
import * as Sentry from "@sentry/node";
import type { Request } from "express";

let sentryInitialized = false;

export function initializeApiSentry(config: ApiConfig): void {
  if (sentryInitialized || !config.SENTRY_DSN) {
    return;
  }

  const options: Sentry.NodeOptions = {
    dsn: config.SENTRY_DSN,
    tracesSampleRate: 0.1
  };

  if (config.SENTRY_ENVIRONMENT) {
    options.environment = config.SENTRY_ENVIRONMENT;
  }

  Sentry.init(options);

  process.on("unhandledRejection", (reason) => {
    Sentry.captureException(reason);
  });

  process.on("uncaughtException", (error) => {
    Sentry.captureException(error);
  });

  sentryInitialized = true;
}

export function captureApiException(error: unknown, request: Request): void {
  if (!sentryInitialized) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag("requestId", request.context.requestId);
    scope.setTag("tenantId", request.context.tenantId ?? "unknown");
    scope.setTag("userId", request.context.userId ?? "anonymous");
    scope.setContext("request", {
      method: request.method,
      path: request.originalUrl,
      traceId: request.context.traceId
    });

    Sentry.captureException(error);
  });
}
