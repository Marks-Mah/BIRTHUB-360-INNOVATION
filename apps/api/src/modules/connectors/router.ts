import type { ApiConfig } from "@birthub/config";
import { Role } from "@birthub/database";
import { Router } from "express";
import { z } from "zod";

import {
  RequireRole,
  requireAuthenticatedSession
} from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import {
  connectorsService,
  parseConnectorOauthState,
  type ConnectorProvider
} from "./service.js";

const providerSchema = z.enum([
  "hubspot",
  "google-workspace",
  "microsoft-graph",
  "salesforce",
  "pipedrive",
  "twilio-whatsapp"
]);

const credentialSchema = z
  .object({
    expiresAt: z.string().datetime().optional(),
    value: z.string().min(1)
  })
  .strict();

const upsertConnectorSchema = z
  .object({
    accountKey: z.string().min(1).optional(),
    authType: z.string().min(1).optional(),
    credentials: z.record(z.string(), credentialSchema).optional(),
    displayName: z.string().min(1).optional(),
    externalAccountId: z.string().min(1).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    provider: providerSchema,
    scopes: z.array(z.string().min(1)).optional(),
    status: z.string().min(1).optional()
  })
  .strict();

const connectSchema = z
  .object({
    accountKey: z.string().min(1).optional(),
    scopes: z.array(z.string().min(1)).optional()
  })
  .strict();

const callbackSchema = z
  .object({
    accessToken: z.string().min(1).optional(),
    accountKey: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    displayName: z.string().min(1).optional(),
    expiresAt: z.string().datetime().optional(),
    externalAccountId: z.string().min(1).optional(),
    refreshToken: z.string().min(1).optional(),
    scopes: z.array(z.string().min(1)).optional(),
    state: z.string().min(1)
  })
  .strict();

const syncSchema = z
  .object({
    accountKey: z.string().min(1).optional(),
    cursor: z.record(z.string(), z.unknown()).optional(),
    scope: z.string().min(1).optional()
  })
  .strict();

function requireOrganizationContext(input: {
  organizationId?: string | null;
  tenantId?: string | null;
  userId?: string | null;
}) {
  if (!input.organizationId || !input.tenantId || !input.userId) {
    throw new ProblemDetailsError({
      detail: "Authenticated organization context is required for connector operations.",
      status: 401,
      title: "Unauthorized"
    });
  }

  return {
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    userId: input.userId
  };
}

function readProvider(value: unknown): ConnectorProvider {
  return providerSchema.parse(value);
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function readOptionalScopes(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const scopes = value
      .flatMap((item) => (typeof item === "string" ? item.split(/[,\s]+/) : []))
      .map((item) => item.trim())
      .filter(Boolean);

    return scopes.length > 0 ? scopes : undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return undefined;
  }

  const scopes = value
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);

  return scopes.length > 0 ? scopes : undefined;
}

function buildCallbackPayload(input: Record<string, unknown>) {
  return callbackSchema.parse({
    accessToken: readOptionalString(input.accessToken ?? input.access_token),
    accountKey: readOptionalString(input.accountKey ?? input.account_key),
    code: readOptionalString(input.code),
    displayName: readOptionalString(input.displayName ?? input.display_name),
    expiresAt: readOptionalString(input.expiresAt ?? input.expires_at),
    externalAccountId: readOptionalString(input.externalAccountId ?? input.external_account_id),
    refreshToken: readOptionalString(input.refreshToken ?? input.refresh_token),
    scopes: readOptionalScopes(input.scopes ?? input.scope),
    state: readOptionalString(input.state)
  });
}

function resolveCallbackContext(input: {
  organizationId?: string | null;
  provider: ConnectorProvider;
  state: string;
  tenantId?: string | null;
}) {
  if (input.organizationId && input.tenantId) {
    return {
      accountKey: undefined,
      organizationId: input.organizationId,
      tenantId: input.tenantId
    };
  }

  const parsedState = parseConnectorOauthState(input.state);
  if (parsedState.provider !== input.provider) {
    throw new ProblemDetailsError({
      detail: `Connector OAuth state was issued for provider '${parsedState.provider}', not '${input.provider}'.`,
      status: 409,
      title: "Connector State Mismatch"
    });
  }

  return {
    accountKey: parsedState.accountKey,
    organizationId: parsedState.organizationId,
    tenantId: parsedState.tenantId
  };
}

export function createConnectorsRouter(config: ApiConfig): Router {
  const router = Router();

  router.get(
    "/",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const context = requireOrganizationContext({
        organizationId: request.context.organizationId,
        tenantId: request.context.tenantId,
        userId: request.context.userId
      });
      const items = await connectorsService.listConnectors({
        organizationId: context.organizationId
      });

      response.status(200).json({
        items,
        requestId: request.context.requestId
      });
    })
  );

  router.post(
    "/",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const payload = upsertConnectorSchema.parse(request.body ?? {});
      const context = requireOrganizationContext({
        organizationId: request.context.organizationId,
        tenantId: request.context.tenantId,
        userId: request.context.userId
      });
      const connector = await connectorsService.upsertConnector({
        ...(payload.accountKey ? { accountKey: payload.accountKey } : {}),
        ...(payload.authType ? { authType: payload.authType } : {}),
        ...(payload.credentials ? { credentials: payload.credentials } : {}),
        ...(payload.displayName ? { displayName: payload.displayName } : {}),
        ...(payload.externalAccountId ? { externalAccountId: payload.externalAccountId } : {}),
        ...(payload.metadata ? { metadata: payload.metadata } : {}),
        organizationId: context.organizationId,
        provider: payload.provider,
        ...(payload.scopes ? { scopes: payload.scopes } : {}),
        ...(payload.status ? { status: payload.status } : {}),
        tenantId: context.tenantId
      });

      response.status(201).json({
        connector,
        requestId: request.context.requestId
      });
    })
  );

  router.post(
    "/:provider/connect",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const payload = connectSchema.parse(request.body ?? {});
      const provider = readProvider(request.params.provider);
      const context = requireOrganizationContext({
        organizationId: request.context.organizationId,
        tenantId: request.context.tenantId,
        userId: request.context.userId
      });
      const session = await connectorsService.createConnectSession({
        ...(payload.accountKey ? { accountKey: payload.accountKey } : {}),
        config,
        organizationId: context.organizationId,
        provider,
        requestId: request.context.requestId,
        ...(payload.scopes ? { scopes: payload.scopes } : {}),
        tenantId: context.tenantId,
        userId: context.userId
      });

      response.status(200).json({
        authorizationUrl: session.authorizationUrl,
        connector: session.connector,
        requestId: request.context.requestId,
        state: session.state
      });
    })
  );

  router.use("/:provider/callback", requireAuthenticatedSession);

  router.post(
    "/:provider/callback",
    requireAuthenticatedSession,
    asyncHandler(async (request, response) => {
      const payload = callbackSchema.parse(request.body ?? {});
      const provider = readProvider(request.params.provider);
      const context = resolveCallbackContext({
        organizationId: request.context.organizationId,
        provider,
        state: payload.state,
        tenantId: request.context.tenantId
      });
      const connector = await connectorsService.finalizeConnectSession({
        ...(payload.accessToken ? { accessToken: payload.accessToken } : {}),
        ...(payload.accountKey || context.accountKey
          ? { accountKey: payload.accountKey ?? context.accountKey }
          : {}),
        ...(payload.code ? { code: payload.code } : {}),
        ...(payload.displayName ? { displayName: payload.displayName } : {}),
        ...(payload.expiresAt ? { expiresAt: payload.expiresAt } : {}),
        ...(payload.externalAccountId ? { externalAccountId: payload.externalAccountId } : {}),
        organizationId: context.organizationId,
        provider,
        ...(payload.refreshToken ? { refreshToken: payload.refreshToken } : {}),
        ...(payload.scopes ? { scopes: payload.scopes } : {}),
        state: payload.state,
        tenantId: context.tenantId
      });

      response.status(200).json({
        connector,
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/:provider/callback",
    requireAuthenticatedSession,
    asyncHandler(async (request, response) => {
      const payload = buildCallbackPayload(request.query as Record<string, unknown>);
      const provider = readProvider(request.params.provider);
      const context = resolveCallbackContext({
        organizationId: request.context.organizationId,
        provider,
        state: payload.state,
        tenantId: request.context.tenantId
      });
      const connector = await connectorsService.finalizeConnectSession({
        ...(payload.accessToken ? { accessToken: payload.accessToken } : {}),
        ...(payload.accountKey || context.accountKey
          ? { accountKey: payload.accountKey ?? context.accountKey }
          : {}),
        ...(payload.code ? { code: payload.code } : {}),
        ...(payload.displayName ? { displayName: payload.displayName } : {}),
        ...(payload.expiresAt ? { expiresAt: payload.expiresAt } : {}),
        ...(payload.externalAccountId ? { externalAccountId: payload.externalAccountId } : {}),
        organizationId: context.organizationId,
        provider,
        ...(payload.refreshToken ? { refreshToken: payload.refreshToken } : {}),
        ...(payload.scopes ? { scopes: payload.scopes } : {}),
        state: payload.state,
        tenantId: context.tenantId
      });

      response.status(200).json({
        connector,
        requestId: request.context.requestId
      });
    })
  );

  router.post(
    "/:provider/sync",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const payload = syncSchema.parse(request.body ?? {});
      const provider = readProvider(request.params.provider);
      const context = requireOrganizationContext({
        organizationId: request.context.organizationId,
        tenantId: request.context.tenantId,
        userId: request.context.userId
      });
      const sync = await connectorsService.triggerSync({
        ...(payload.accountKey ? { accountKey: payload.accountKey } : {}),
        config,
        ...(payload.cursor ? { cursor: payload.cursor } : {}),
        organizationId: context.organizationId,
        provider,
        ...(payload.scope ? { scope: payload.scope } : {}),
        tenantId: context.tenantId
      });

      response.status(202).json({
        requestId: request.context.requestId,
        sync
      });
    })
  );

  return router;
}
