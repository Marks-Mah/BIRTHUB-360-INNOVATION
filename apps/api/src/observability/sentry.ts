
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
    scope.setTag("requestId", request.context?.requestId ?? "unknown");
    scope.setTag("tenantId", request.context?.tenantId ?? "unknown");
    scope.setTag("userId", request.context?.userId ?? "anonymous");
    scope.setContext("request", {
      method: request.method,
      path: request.originalUrl,
      traceId: request.context?.traceId ?? null
    });

    Sentry.captureException(error);
  });
}

export function captureWebhookException(
  error: unknown,
  context: {
    organizationId?: string | undefined;
    requestId?: string | undefined;
    stripeEventId: string;
    stripeEventType: string;
    tenantId?: string | undefined;
    traceId?: string | undefined;
  }
): void {
  if (!sentryInitialized) {
    return;
  }

  Sentry.withScope((scope) => {
    scope.setTag("requestId", context.requestId ?? "unknown");
    scope.setTag("tenantId", context.tenantId ?? "unknown");
    scope.setTag("stripeEventId", context.stripeEventId);
    scope.setTag("stripeEventType", context.stripeEventType);

    if (context.organizationId) {
      scope.setTag("organizationId", context.organizationId);
    }

    if (context.traceId) {
      scope.setTag("traceId", context.traceId);
    }

    scope.setContext("webhook", {
      organizationId: context.organizationId ?? null,
      stripeEventId: context.stripeEventId,
      stripeEventType: context.stripeEventType,
      tenantId: context.tenantId ?? null,
      traceId: context.traceId ?? null
    });

    Sentry.captureException(error);
  });
}
