import type { ApiConfig } from "@birthub/config";
import {
  createOrganizationRequestSchema,
  createOrganizationResponseSchema,
  getApiConfig,
  loginRequestSchema,
  loginResponseSchema,
  logoutResponseSchema,
  mfaVerifyRequestSchema,
  refreshRequestSchema,
  refreshResponseSchema,
  sessionListResponseSchema,
  taskEnqueuedResponseSchema,
  taskRequestSchema
} from "@birthub/config";
import { createLogger } from "@birthub/logger";
import cors from "cors";
import express from "express";
import type { Express } from "express";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import {
  configureCacheStore,
  registerTenantCacheInvalidationMiddleware
} from "./common/cache/index.js";
import { openApiDocument } from "./docs/openapi.js";
import { createDeepHealthService, createHealthService } from "./lib/health.js";
import { asyncHandler, ProblemDetailsError } from "./lib/problem-details.js";
import {
  enqueueTask,
  QueueBackpressureError,
  TenantQueueRateLimitError
} from "./lib/queue.js";
import { contentTypeMiddleware } from "./middleware/content-type.js";
import { csrfProtection } from "./middleware/csrf.js";
import { errorHandler, notFoundMiddleware } from "./middleware/error-handler.js";
import { authenticationMiddleware } from "./middleware/authentication.js";
import { originValidationMiddleware } from "./middleware/origin-check.js";
import {
  createLoginRateLimitMiddleware,
  createRateLimitMiddleware,
  createWebhookRateLimitMiddleware
} from "./middleware/rate-limit.js";
import { requestContextMiddleware } from "./middleware/request-context.js";
import { sanitizeMutationInput } from "./middleware/sanitize-input.js";
import { tenantContextMiddleware } from "./middleware/tenant-context.js";
import { validateBody } from "./middleware/validate-body.js";
import { createBudgetRouter } from "./modules/budget/budget-routes.js";
import { budgetService } from "./modules/budget/budget.service.js";
import { BudgetExceededError } from "./modules/budget/budget.types.js";
import { createAdminRouter } from "./modules/admin/router.js";
import { createAnalyticsRouter } from "./modules/analytics/router.js";
import { createApiKeysRouter } from "./modules/apikeys/router.js";
import {
  listActiveSessions,
  loginWithPassword,
  refreshSession,
  resolveOrganizationId,
  revokeCurrentSession,
  verifyMfaChallenge
} from "./modules/auth/auth.service.js";
import { createAuthRouter } from "./modules/auth/router.js";
import { clearAuthCookies, setAuthCookies } from "./modules/auth/cookies.js";
import { createMarketplaceRouter } from "./modules/marketplace/marketplace-routes.js";
import { createBillingRouter, getBillingSnapshot } from "./modules/billing/index.js";
import { createFeedbackRouter } from "./modules/feedback/index.js";
import { createInvitesRouter } from "./modules/invites/router.js";
import { createNotificationsRouter } from "./modules/notifications/index.js";
import { createOrganizationsRouter } from "./modules/organizations/router.js";
import { createOrganization } from "./modules/organizations/service.js";
import { startOutputRetentionScheduler } from "./modules/outputs/output-retention.js";
import { createOutputRouter } from "./modules/outputs/output-routes.js";
import { createPackInstallerRouter } from "./modules/packs/pack-installer-routes.js";
import { createPrivacyRouter } from "./modules/privacy/router.js";
import { createSessionsRouter } from "./modules/sessions/router.js";
import { createUsersRouter } from "./modules/users/router.js";
import { createInstalledAgentsRouter } from "./modules/agents/router.js";
import { createWebhooksRouter, initializeWorkflowInternalEventBridge } from "./modules/webhooks/index.js";
import { createStripeWebhookRouter } from "./modules/webhooks/stripe.router.js";
import { createWorkflowsRouter } from "./modules/workflows/index.js";

const logger = createLogger("api");

export interface AppDependencies {
  config?: ApiConfig;
  enqueueTask?: typeof enqueueTask;
  healthService?: ReturnType<typeof createHealthService>;
  shouldExposeDocs?: boolean;
}

export function createApp(dependencies: AppDependencies = {}): Express {
  const config = dependencies.config ?? getApiConfig();
  const app = express();
  const healthService = dependencies.healthService ?? createHealthService(config);
  const deepHealthService = createDeepHealthService(config);
  const enqueueTaskDependency = dependencies.enqueueTask ?? enqueueTask;
  const shouldExposeDocs = dependencies.shouldExposeDocs ?? config.NODE_ENV !== "production";
  const stripeWebhookEnabled = Boolean(config.STRIPE_SECRET_KEY && config.STRIPE_WEBHOOK_SECRET);

  configureCacheStore(config.REDIS_URL);
  if (config.NODE_ENV !== "test") {
    registerTenantCacheInvalidationMiddleware();
  }
  initializeWorkflowInternalEventBridge(config);

  app.disable("x-powered-by");
  app.use(requestContextMiddleware);
  app.use(authenticationMiddleware(config.API_AUTH_COOKIE_NAME));
  app.use(tenantContextMiddleware);
  app.use(
    helmet({
      contentSecurityPolicy: false
    })
  );
  app.use(
    cors({
      credentials: true,
      origin: (origin, callback) => {
        if (!origin || config.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(
          new ProblemDetailsError({
            detail: `Origin '${origin}' is not present in the API allowlist.`,
            status: 403,
            title: "Forbidden"
          })
        );
      }
    })
  );
  if (stripeWebhookEnabled) {
    app.use(
      "/api/webhooks",
      createWebhookRateLimitMiddleware(config),
      createStripeWebhookRouter(config)
    );
  }
  app.use(contentTypeMiddleware);
  app.use((request, response, next) => {
    request.setTimeout(config.API_HANDLER_TIMEOUT_MS);
    response.setTimeout(config.API_HANDLER_TIMEOUT_MS, () => {
      if (response.headersSent) {
        return;
      }

      next(
        new ProblemDetailsError({
          detail: `Request exceeded ${config.API_HANDLER_TIMEOUT_MS}ms timeout budget.`,
          status: 408,
          title: "Request Timeout"
        })
      );
    });
    next();
  });
  app.use(express.json({ limit: config.API_JSON_BODY_LIMIT }));
  app.use(sanitizeMutationInput);
  app.use(originValidationMiddleware(config.corsOrigins));
  app.use(
    csrfProtection({
      cookieName: config.API_CSRF_COOKIE_NAME,
      headerName: config.API_CSRF_HEADER_NAME
    })
  );
  app.use(createRateLimitMiddleware(config));

  if (config.NODE_ENV !== "test") {
    startOutputRetentionScheduler();
  }

  if (shouldExposeDocs) {
    app.get("/api/openapi.json", (_request, response) => {
      response.json(openApiDocument);
    });

    app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
  }

  app.get(
    "/health",
    asyncHandler(async (_request, response) => {
      response.status(200).json(await healthService());
    })
  );

  app.get(
    "/api/v1/health",
    asyncHandler(async (_request, response) => {
      response.status(200).json(await healthService());
    })
  );

  app.get(
    "/health/deep",
    asyncHandler(async (_request, response) => {
      response.status(200).json(await deepHealthService());
    })
  );

  app.get(
    "/api/v1/health/deep",
    asyncHandler(async (_request, response) => {
      response.status(200).json(await deepHealthService());
    })
  );

  app.post(
    "/api/v1/auth/login",
    createLoginRateLimitMiddleware(config),
    validateBody(loginRequestSchema),
    asyncHandler(async (request, response) => {
      const organizationId = await resolveOrganizationId(request.body.tenantId);

      if (!organizationId) {
        throw new ProblemDetailsError({
          detail: "Invalid organization reference for login.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const login = await loginWithPassword({
        config,
        email: request.body.email,
        ipAddress: request.ip ?? null,
        organizationId,
        password: request.body.password,
        userAgent: request.header("user-agent") ?? null
      });

      if (login.mfaRequired) {
        response.status(200).json(
          loginResponseSchema.parse({
            challengeExpiresAt: login.challengeExpiresAt.toISOString(),
            challengeToken: login.challengeToken,
            mfaRequired: true,
            requestId: request.context.requestId
          })
        );
        return;
      }

      request.context.tenantId = request.body.tenantId;
      request.context.userId = login.userId;
      request.context.sessionId = login.sessionId;
      request.context.authType = "session";
      setAuthCookies(response, config, login.tokens);

      response.status(200).json(
        loginResponseSchema.parse({
          mfaRequired: false,
          requestId: request.context.requestId,
          session: {
            csrfToken: login.tokens.csrfToken,
            expiresAt: login.tokens.expiresAt.toISOString(),
            id: login.sessionId,
            refreshToken: login.tokens.refreshToken,
            tenantId: request.body.tenantId,
            token: login.tokens.token,
            userId: login.userId
          }
        })
      );
    })
  );

  app.post(
    "/api/v1/auth/mfa/challenge",
    validateBody(mfaVerifyRequestSchema),
    asyncHandler(async (request, response) => {
      const organizationId = request.context.tenantId;

      if (!organizationId) {
        throw new ProblemDetailsError({
          detail: "Tenant context is required for MFA verification.",
          status: 400,
          title: "Bad Request"
        });
      }

      const session = await verifyMfaChallenge({
        challengeToken: request.body.challengeToken,
        config,
        ipAddress: request.ip ?? null,
        organizationId,
        recoveryCode: request.body.recoveryCode,
        totpCode: request.body.totpCode,
        userAgent: request.header("user-agent") ?? null
      });

      request.context.userId = session.userId;
      request.context.sessionId = session.sessionId;
      request.context.authType = "session";
      setAuthCookies(response, config, session.tokens);

      response.status(200).json(
        loginResponseSchema.parse({
          mfaRequired: false,
          requestId: request.context.requestId,
          session: {
            csrfToken: session.tokens.csrfToken,
            expiresAt: session.tokens.expiresAt.toISOString(),
            id: session.sessionId,
            refreshToken: session.tokens.refreshToken,
            tenantId: organizationId,
            token: session.tokens.token,
            userId: session.userId
          }
        })
      );
    })
  );

  app.post(
    "/api/v1/auth/refresh",
    validateBody(refreshRequestSchema),
    asyncHandler(async (request, response) => {
      const result = await refreshSession({
        config,
        ipAddress: request.ip ?? null,
        refreshToken: request.body.refreshToken,
        userAgent: request.header("user-agent") ?? null
      });

      if (!result.tokens || !result.sessionId || !result.organizationId || !result.userId) {
        throw new ProblemDetailsError({
          detail: result.breached
            ? "Refresh token reuse detected."
            : "Refresh token is invalid or expired.",
          status: result.breached ? 409 : 401,
          title: result.breached ? "Conflict" : "Unauthorized"
        });
      }

      setAuthCookies(response, config, result.tokens);
      response.status(200).json(
        refreshResponseSchema.parse({
          requestId: request.context.requestId,
          session: {
            csrfToken: result.tokens.csrfToken,
            expiresAt: result.tokens.expiresAt.toISOString(),
            id: result.sessionId,
            refreshToken: result.tokens.refreshToken,
            tenantId: result.organizationId,
            token: result.tokens.token,
            userId: result.userId
          }
        })
      );
    })
  );

  app.post(
    "/api/v1/auth/logout",
    asyncHandler(async (request, response) => {
      if (!request.context.sessionId) {
        throw new ProblemDetailsError({
          detail: "A valid authenticated session is required.",
          status: 401,
          title: "Unauthorized"
        });
      }

      await revokeCurrentSession(request.context.sessionId);
      clearAuthCookies(response, config);
      response.status(200).json(
        logoutResponseSchema.parse({
          requestId: request.context.requestId,
          revokedSessions: 1
        })
      );
    })
  );

  app.get(
    "/api/v1/sessions",
    asyncHandler(async (request, response) => {
      if (!request.context.tenantId || !request.context.userId) {
        throw new ProblemDetailsError({
          detail: "A valid authenticated session is required.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const sessions = await listActiveSessions({
        organizationId: request.context.tenantId,
        userId: request.context.userId
      });

      response.status(200).json(
        sessionListResponseSchema.parse({
          items: sessions.map((session) => ({
            id: session.id,
            ipAddress: session.ipAddress,
            lastActivityAt: session.lastActivityAt.toISOString(),
            userAgent: session.userAgent
          })),
          requestId: request.context.requestId
        })
      );
    })
  );

  app.post(
    "/api/v1/organizations",
    validateBody(createOrganizationRequestSchema),
    asyncHandler(async (request, response) => {
      const organization = await createOrganization({
        adminEmail: request.body.adminEmail,
        adminName: request.body.adminName,
        adminPassword: request.body.adminPassword,
        name: request.body.name,
        requestId: request.context.requestId,
        slug: request.body.slug
      });

      request.context.tenantId = organization.tenantId ?? null;
      request.context.userId = organization.ownerUserId;

      logger.info(
        {
          organizationId: organization.organizationId,
          requestId: request.context.requestId,
          tenantId: organization.tenantId,
          userId: organization.ownerUserId
        },
        "Provisioned organization"
      );

      response.status(201).json(createOrganizationResponseSchema.parse(organization));
    })
  );

  app.get(
    "/api/v1/me",
    asyncHandler(async (request, response) => {
      if (!request.context.tenantId) {
        throw new ProblemDetailsError({
          detail: "Tenant context is required to resolve profile.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const billing = await getBillingSnapshot(
        request.context.tenantId,
        config.BILLING_GRACE_PERIOD_DAYS
      );

      response.status(200).json({
        plan: {
          code: billing.plan.code,
          currentPeriodEnd: billing.currentPeriodEnd,
          hardLocked: billing.hardLocked,
          isPaid: billing.isPaid,
          isWithinGracePeriod: billing.isWithinGracePeriod,
          name: billing.plan.name,
          secondsUntilHardLock: billing.secondsUntilHardLock,
          status: billing.status
        },
        plan_status: {
          code: billing.plan.code,
          hardLocked: billing.hardLocked,
          isWithinGracePeriod: billing.isWithinGracePeriod,
          status: billing.status
        },
        requestId: request.context.requestId,
        user: {
          id: request.context.userId,
          tenantId: request.context.tenantId
        }
      });
    })
  );

  app.post(
    "/api/v1/tasks",
    validateBody(taskRequestSchema),
    asyncHandler(async (request, response) => {
      const tenantId = request.context.tenantId ?? "default-tenant";
      const userId = request.context.userId ?? "system";

      try {
        budgetService.consumeBudget({
          agentId: request.body.agentId,
          costBRL: request.body.estimatedCostBRL,
          executionMode: request.body.executionMode,
          tenantId
        });
      } catch (error) {
        if (error instanceof BudgetExceededError) {
          throw new ProblemDetailsError({
            detail: `Agent ${error.agentId} reached 100% budget usage and is blocked.`,
            status: 402,
            title: "Budget Exceeded"
          });
        }

        throw error;
      }

      let job: { jobId: string };

      try {
        job = await enqueueTaskDependency(config, {
          agentId: request.body.agentId,
          approvalRequired: request.body.approvalRequired,
          context: request.context.tenantId
            ? {
                actorId: userId,
                jobId: request.context.requestId,
                scopedAt: new Date().toISOString(),
                tenantId
              }
            : undefined,
          estimatedCostBRL: request.body.estimatedCostBRL,
          executionMode: request.body.executionMode,
          payload: request.body.payload,
          requestId: request.context.requestId,
          signature: Buffer.from(`${tenantId}:${request.context.requestId}`).toString("base64url"),
          tenantId,
          type: request.body.type,
          userId,
          version: "1"
        });
      } catch (error) {
        if (error instanceof TenantQueueRateLimitError) {
          throw new ProblemDetailsError({
            detail: `Tenant ${error.tenantId} exceeded the queue rate limit. Retry later.`,
            status: 429,
            title: "Too Many Requests"
          });
        }

        if (error instanceof QueueBackpressureError) {
          throw new ProblemDetailsError({
            detail: `Queue backlog reached ${error.pendingJobs} pending jobs. Retry later.`,
            status: 503,
            title: "Service Unavailable"
          });
        }

        throw error;
      }

      logger.info(
        {
          jobId: job.jobId,
          requestId: request.context.requestId,
          tenantId: request.context.tenantId,
          userId: request.context.userId
        },
        "Queued task for worker processing"
      );

      response.status(202).json(
        taskEnqueuedResponseSchema.parse({
          jobId: job.jobId,
          requestId: request.context.requestId
        })
      );
    })
  );

  const marketplaceRouter = createMarketplaceRouter();
  const installedAgentsRouter = createInstalledAgentsRouter();
  app.use(createAdminRouter(config));
  app.use("/api/v1/auth", createAuthRouter(config));
  app.use("/api/v1", createSessionsRouter(config));
  app.use("/api/v1/apikeys", createApiKeysRouter(config));
  app.use("/api/v1/agents", installedAgentsRouter);
  app.use("/api/v1/agents", marketplaceRouter);
  app.use("/api/v1/analytics", createAnalyticsRouter());
  app.use("/api/v1/marketplace", marketplaceRouter);
  app.use("/api/v1/billing", createBillingRouter(config));
  app.use("/api/v1/budgets", createBudgetRouter());
  app.use("/api/v1", createFeedbackRouter());
  app.use("/api/v1", createInvitesRouter());
  app.use("/api/v1", createNotificationsRouter());
  app.use("/api/v1", createOrganizationsRouter());
  app.use("/api/v1/packs", createPackInstallerRouter());
  app.use("/api/v1/outputs", createOutputRouter());
  app.use("/api/v1/privacy", createPrivacyRouter(config));
  app.use("/api/v1", createUsersRouter());
  app.use(createWorkflowsRouter(config));
  app.use(createWebhooksRouter(config));

  app.use(notFoundMiddleware);
  app.use(errorHandler);

  return app;
}
