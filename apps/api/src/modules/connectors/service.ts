import type { ApiConfig } from "@birthub/config";
import { Prisma, prisma } from "@birthub/database";

import { encryptConnectorToken } from "../../lib/encryption.js";
import { ProblemDetailsError } from "../../lib/problem-details.js";
import { enqueueCrmSync } from "../engagement/queues.js";

export type ConnectorProvider =
  | "google-workspace"
  | "hubspot"
  | "microsoft-graph"
  | "pipedrive"
  | "salesforce"
  | "twilio-whatsapp";

export interface ConnectorOauthState {
  accountKey: string;
  organizationId: string;
  provider: ConnectorProvider;
  requestId: string;
  tenantId: string;
  userId: string;
  version: 1;
}

const connectorProviders = new Set<ConnectorProvider>([
  "google-workspace",
  "hubspot",
  "microsoft-graph",
  "pipedrive",
  "salesforce",
  "twilio-whatsapp"
]);

type ConnectorCredentialInput = {
  expiresAt?: string | undefined;
  value: string;
};

type ConnectorCredentialsRecord = Record<string, ConnectorCredentialInput>;

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function parseExpiry(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeCredentials(input?: Record<string, ConnectorCredentialInput>): ConnectorCredentialsRecord {
  return input ?? {};
}

function buildOauthState(input: {
  accountKey: string;
  organizationId: string;
  provider: ConnectorProvider;
  requestId: string;
  tenantId: string;
  userId: string;
}): string {
  return Buffer.from(
    JSON.stringify({
      accountKey: input.accountKey,
      organizationId: input.organizationId,
      provider: input.provider,
      requestId: input.requestId,
      tenantId: input.tenantId,
      userId: input.userId,
      version: 1
    })
  ).toString("base64url");
}

export function parseConnectorOauthState(state: string): ConnectorOauthState {
  try {
    const parsed = JSON.parse(Buffer.from(state, "base64url").toString("utf8")) as unknown;

    if (!parsed || typeof parsed !== "object") {
      throw new Error("State payload is not an object.");
    }

    const candidate = parsed as Record<string, unknown>;
    if (
      typeof candidate.accountKey !== "string" ||
      typeof candidate.organizationId !== "string" ||
      typeof candidate.provider !== "string" ||
      typeof candidate.requestId !== "string" ||
      typeof candidate.tenantId !== "string" ||
      typeof candidate.userId !== "string" ||
      candidate.version !== 1
    ) {
      throw new Error("State payload is missing required fields.");
    }

    if (!connectorProviders.has(candidate.provider as ConnectorProvider)) {
      throw new Error(`Unsupported provider '${String(candidate.provider)}' in OAuth state.`);
    }

    const provider = candidate.provider as ConnectorProvider;

    return {
      accountKey: candidate.accountKey,
      organizationId: candidate.organizationId,
      provider,
      requestId: candidate.requestId,
      tenantId: candidate.tenantId,
      userId: candidate.userId,
      version: 1
    };
  } catch (error) {
    throw new ProblemDetailsError({
      detail: error instanceof Error ? error.message : "Connector OAuth state could not be parsed.",
      status: 409,
      title: "Connector OAuth State Invalid"
    });
  }
}

function getProviderOauthConfig(config: ApiConfig, provider: ConnectorProvider): {
  authorizationUrl: string;
  clientId: string;
  defaultScopes: string[];
  redirectUri: string;
} | null {
  switch (provider) {
    case "hubspot":
      if (
        !config.HUBSPOT_CLIENT_ID ||
        !config.HUBSPOT_CLIENT_SECRET ||
        !config.HUBSPOT_REDIRECT_URI
      ) {
        return null;
      }

      return {
        authorizationUrl: "https://app.hubspot.com/oauth/authorize",
        clientId: config.HUBSPOT_CLIENT_ID,
        defaultScopes: ["crm.objects.companies.read", "crm.objects.companies.write"],
        redirectUri: config.HUBSPOT_REDIRECT_URI
      };
    case "google-workspace":
      if (
        !config.GOOGLE_CLIENT_ID ||
        !config.GOOGLE_CLIENT_SECRET ||
        !config.GOOGLE_REDIRECT_URI
      ) {
        return null;
      }

      return {
        authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        clientId: config.GOOGLE_CLIENT_ID,
        defaultScopes: [
          "https://www.googleapis.com/auth/calendar",
          "https://www.googleapis.com/auth/gmail.send"
        ],
        redirectUri: config.GOOGLE_REDIRECT_URI
      };
    case "microsoft-graph":
      if (
        !config.MICROSOFT_CLIENT_ID ||
        !config.MICROSOFT_CLIENT_SECRET ||
        !config.MICROSOFT_REDIRECT_URI
      ) {
        return null;
      }

      return {
        authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
        clientId: config.MICROSOFT_CLIENT_ID,
        defaultScopes: ["offline_access", "Calendars.ReadWrite", "Mail.Send", "User.Read"],
        redirectUri: config.MICROSOFT_REDIRECT_URI
      };
    default:
      return null;
  }
}

function buildAuthorizationUrl(input: {
  provider: ConnectorProvider;
  scopes: string[];
  state: string;
  oauth: {
    authorizationUrl: string;
    clientId: string;
    redirectUri: string;
  };
}): string {
  const url = new URL(input.oauth.authorizationUrl);
  url.searchParams.set("client_id", input.oauth.clientId);
  url.searchParams.set("redirect_uri", input.oauth.redirectUri);
  url.searchParams.set("state", input.state);

  switch (input.provider) {
    case "hubspot":
      url.searchParams.set("scope", input.scopes.join(" "));
      break;
    case "google-workspace":
      url.searchParams.set("access_type", "offline");
      url.searchParams.set("prompt", "consent");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("scope", input.scopes.join(" "));
      break;
    case "microsoft-graph":
      url.searchParams.set("response_type", "code");
      url.searchParams.set("response_mode", "query");
      url.searchParams.set("scope", input.scopes.join(" "));
      break;
    default:
      throw new Error(`Unsupported OAuth provider: ${input.provider}`);
  }

  return url.toString();
}

async function resolveConnectorAccount(input: {
  accountKey?: string | undefined;
  organizationId: string;
  provider: ConnectorProvider;
}) {
  return prisma.connectorAccount.findFirst({
    include: {
      _count: {
        select: {
          threads: true
        }
      },
      credentials: {
        orderBy: {
          createdAt: "asc"
        }
      },
      syncCursors: {
        orderBy: {
          updatedAt: "desc"
        }
      },
      threads: {
        orderBy: {
          updatedAt: "desc"
        },
        take: 10
      }
    },
    where: {
      accountKey: input.accountKey ?? "primary",
      organizationId: input.organizationId,
      provider: input.provider
    }
  });
}

function sanitizeConnectorAccount(
  account: Awaited<ReturnType<typeof resolveConnectorAccount>>
) {
  if (!account) {
    return null;
  }

  return {
    accountKey: account.accountKey,
    authType: account.authType,
    connectedAt: account.connectedAt?.toISOString() ?? null,
    credentialMetadata: account.credentials.map((credential) => ({
      credentialType: credential.credentialType,
      expiresAt: credential.expiresAt?.toISOString() ?? null
    })),
    displayName: account.displayName,
    externalAccountId: account.externalAccountId,
    id: account.id,
    lastSyncAt: account.lastSyncAt?.toISOString() ?? null,
    metadata: account.metadata,
    provider: account.provider,
    scopes: account.scopes,
    status: account.status,
    recentThreads: account.threads.map((thread) => ({
      channel: thread.channel,
      correlationId: thread.correlationId,
      id: thread.id,
      status: thread.status,
      updatedAt: thread.updatedAt.toISOString()
    })),
    syncCursors: account.syncCursors.map((cursor) => ({
      errorMessage: cursor.errorMessage,
      id: cursor.id,
      lastSyncAt: cursor.lastSyncAt?.toISOString() ?? null,
      nextSyncAt: cursor.nextSyncAt?.toISOString() ?? null,
      scope: cursor.scope,
      status: cursor.status
    })),
    threadCount: account._count.threads,
    updatedAt: account.updatedAt.toISOString()
  };
}

async function upsertCredentials(input: {
  connectorAccountId: string;
  credentials: ConnectorCredentialsRecord;
  organizationId: string;
  tenantId: string;
}) {
  const entries = Object.entries(input.credentials);
  await Promise.all(
    entries.map(async ([credentialType, credential]) =>
      prisma.connectorCredential.upsert({
        create: {
          connectorAccountId: input.connectorAccountId,
          credentialType,
          encryptedValue: encryptConnectorToken(credential.value),
          ...(credential.expiresAt ? { expiresAt: parseExpiry(credential.expiresAt) } : {}),
          organizationId: input.organizationId,
          tenantId: input.tenantId
        },
        update: {
          encryptedValue: encryptConnectorToken(credential.value),
          expiresAt: parseExpiry(credential.expiresAt)
        },
        where: {
          connectorAccountId_credentialType: {
            connectorAccountId: input.connectorAccountId,
            credentialType
          }
        }
      })
    )
  );
}

export const connectorsService = {
  async listConnectors(input: { organizationId: string }) {
    const accounts = await prisma.connectorAccount.findMany({
      include: {
        _count: {
          select: {
            threads: true
          }
        },
        credentials: {
          orderBy: {
            createdAt: "asc"
          }
        },
        syncCursors: {
          orderBy: {
            updatedAt: "desc"
          }
        },
        threads: {
          orderBy: {
            updatedAt: "desc"
          },
          take: 10
        }
      },
      orderBy: [{ provider: "asc" }, { accountKey: "asc" }],
      where: {
        organizationId: input.organizationId
      }
    });

    return accounts.map((account) => sanitizeConnectorAccount(account));
  },

  async upsertConnector(input: {
    accountKey?: string | undefined;
    authType?: string | undefined;
    credentials?: ConnectorCredentialsRecord | undefined;
    displayName?: string | undefined;
    externalAccountId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
    organizationId: string;
    provider: ConnectorProvider;
    scopes?: string[] | undefined;
    status?: string | undefined;
    tenantId: string;
  }) {
    const account = await prisma.connectorAccount.upsert({
      create: {
        accountKey: input.accountKey ?? "primary",
        authType: input.authType ?? "oauth",
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.externalAccountId ? { externalAccountId: input.externalAccountId } : {}),
        ...(input.metadata ? { metadata: toJsonValue(input.metadata) } : {}),
        organizationId: input.organizationId,
        provider: input.provider,
        ...(input.scopes ? { scopes: toJsonValue(input.scopes) } : {}),
        status: input.status ?? "active",
        tenantId: input.tenantId
      },
      update: {
        authType: input.authType ?? "oauth",
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.externalAccountId ? { externalAccountId: input.externalAccountId } : {}),
        ...(input.metadata ? { metadata: toJsonValue(input.metadata) } : {}),
        ...(input.scopes ? { scopes: toJsonValue(input.scopes) } : {}),
        status: input.status ?? "active"
      },
      where: {
        organizationId_provider_accountKey: {
          accountKey: input.accountKey ?? "primary",
          organizationId: input.organizationId,
          provider: input.provider
        }
      }
    });

    const credentials = normalizeCredentials(input.credentials);
    if (Object.keys(credentials).length > 0) {
      await upsertCredentials({
        connectorAccountId: account.id,
        credentials,
        organizationId: input.organizationId,
        tenantId: input.tenantId
      });
    }

    return sanitizeConnectorAccount(
      await resolveConnectorAccount({
        accountKey: input.accountKey,
        organizationId: input.organizationId,
        provider: input.provider
      })
    );
  },

  async createConnectSession(input: {
    accountKey?: string | undefined;
    config: ApiConfig;
    organizationId: string;
    provider: ConnectorProvider;
    requestId: string;
    scopes?: string[] | undefined;
    tenantId: string;
    userId: string;
  }) {
    const oauth = getProviderOauthConfig(input.config, input.provider);
    if (!oauth) {
      throw new ProblemDetailsError({
        detail: `Provider '${input.provider}' is not configured for OAuth in this environment.`,
        status: 409,
        title: "Connector OAuth Not Configured"
      });
    }

    const state = buildOauthState({
      accountKey: input.accountKey ?? "primary",
      organizationId: input.organizationId,
      provider: input.provider,
      requestId: input.requestId,
      tenantId: input.tenantId,
      userId: input.userId
    });
    const scopes = input.scopes?.length ? input.scopes : oauth.defaultScopes;
    const account = await prisma.connectorAccount.upsert({
      create: {
        accountKey: input.accountKey ?? "primary",
        authType: "oauth",
        metadata: toJsonValue({
          oauthState: state,
          requestedScopes: scopes
        }),
        organizationId: input.organizationId,
        provider: input.provider,
        scopes: toJsonValue(scopes),
        status: "pending",
        tenantId: input.tenantId
      },
      update: {
        metadata: toJsonValue({
          oauthState: state,
          requestedScopes: scopes
        }),
        scopes: toJsonValue(scopes),
        status: "pending"
      },
      where: {
        organizationId_provider_accountKey: {
          accountKey: input.accountKey ?? "primary",
          organizationId: input.organizationId,
          provider: input.provider
        }
      }
    });

    return {
      authorizationUrl: buildAuthorizationUrl({
        oauth,
        provider: input.provider,
        scopes,
        state
      }),
      connector: sanitizeConnectorAccount(
        await resolveConnectorAccount({
          accountKey: account.accountKey,
          organizationId: input.organizationId,
          provider: input.provider
        })
      ),
      state
    };
  },

  async finalizeConnectSession(input: {
    accessToken?: string | undefined;
    accountKey?: string | undefined;
    code?: string | undefined;
    displayName?: string | undefined;
    expiresAt?: string | undefined;
    externalAccountId?: string | undefined;
    organizationId: string;
    provider: ConnectorProvider;
    refreshToken?: string | undefined;
    scopes?: string[] | undefined;
    state: string;
    tenantId: string;
  }) {
    const account = await resolveConnectorAccount({
      accountKey: input.accountKey,
      organizationId: input.organizationId,
      provider: input.provider
    });

    if (!account) {
      throw new ProblemDetailsError({
        detail: "Connector account was not initialized for this callback.",
        status: 404,
        title: "Connector Not Found"
      });
    }

    const metadata =
      account.metadata && typeof account.metadata === "object"
        ? (account.metadata as Record<string, unknown>)
        : {};
    if (metadata.oauthState !== input.state) {
      throw new ProblemDetailsError({
        detail: "Connector OAuth state validation failed.",
        status: 409,
        title: "Connector State Mismatch"
      });
    }

    const credentials: ConnectorCredentialsRecord = {};
    if (input.code) {
      credentials.authorization_code = {
        value: input.code
      };
    }
    if (input.accessToken) {
      credentials.access_token = {
        ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
        value: input.accessToken
      };
    }
    if (input.refreshToken) {
      credentials.refresh_token = {
        value: input.refreshToken
      };
    }

    await prisma.connectorAccount.update({
      data: {
        connectedAt: new Date(),
        ...(input.displayName ? { displayName: input.displayName } : {}),
        ...(input.externalAccountId ? { externalAccountId: input.externalAccountId } : {}),
        metadata: toJsonValue({
          callbackReceivedAt: new Date().toISOString(),
          requestedScopes: input.scopes ?? metadata.requestedScopes ?? [],
          stateValidated: true
        }),
        ...(input.scopes ? { scopes: toJsonValue(input.scopes) } : {}),
        status:
          input.accessToken || input.refreshToken
            ? "active"
            : input.code
              ? "pending_token_exchange"
              : "pending"
      },
      where: {
        id: account.id
      }
    });

    if (Object.keys(credentials).length > 0) {
      await upsertCredentials({
        connectorAccountId: account.id,
        credentials,
        organizationId: input.organizationId,
        tenantId: input.tenantId
      });
    }

    return sanitizeConnectorAccount(
      await resolveConnectorAccount({
        accountKey: account.accountKey,
        organizationId: input.organizationId,
        provider: input.provider
      })
    );
  },

  async triggerSync(input: {
    accountKey?: string | undefined;
    config: ApiConfig;
    cursor?: Record<string, unknown> | undefined;
    organizationId: string;
    provider: ConnectorProvider;
    scope?: string | undefined;
    tenantId: string;
  }) {
    const account = await resolveConnectorAccount({
      accountKey: input.accountKey,
      organizationId: input.organizationId,
      provider: input.provider
    });
    const scope = input.scope ?? `${input.provider}:default`;

    if (account) {
      await prisma.connectorSyncCursor.upsert({
        create: {
          ...(input.cursor ? { cursor: toJsonValue(input.cursor) } : { cursor: toJsonValue({}) }),
          connectorAccountId: account.id,
          lastSyncAt: new Date(),
          organizationId: input.organizationId,
          scope,
          status: "queued",
          tenantId: input.tenantId
        },
        update: {
          ...(input.cursor ? { cursor: toJsonValue(input.cursor) } : {}),
          lastSyncAt: new Date(),
          status: "queued"
        },
        where: {
          connectorAccountId_scope: {
            connectorAccountId: account.id,
            scope
          }
        }
      });

      await prisma.connectorAccount.update({
        data: {
          lastSyncAt: new Date(),
          status: account.status === "pending" ? "syncing" : account.status
        },
        where: {
          id: account.id
        }
      });
    }

    let queued = false;
    if (input.provider === "hubspot") {
      await enqueueCrmSync(input.config, {
        kind: "company-upsert",
        organizationId: input.organizationId,
        tenantId: input.tenantId
      });
      queued = true;
    }

    return {
      provider: input.provider,
      queued,
      scope
    };
  }
};
