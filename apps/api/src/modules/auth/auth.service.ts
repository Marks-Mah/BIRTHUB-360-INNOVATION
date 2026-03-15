import {
  ApiKeyStatus,
  MembershipStatus,
  Role,
  UserStatus,
  prisma
} from "@birthub/database";
import type { ApiConfig } from "@birthub/config";

import {
  createAccessToken,
  createApiKey,
  createRefreshToken,
  hashPassword,
  randomToken,
  sha256,
  verifyPasswordHash
} from "./crypto.js";
import {
  buildOtpauthUrl,
  buildQrCodeDataUrl,
  decryptTotpSecret,
  encryptTotpSecret,
  generateRecoveryCodes,
  generateTotpSecret,
  hashRecoveryCode,
  verifyTotpCode
} from "./mfa.service.js";

type ApiKeyScope = "agents:read" | "agents:write" | "workflows:trigger" | "webhooks:receive";

export interface AuthenticatedContext {
  apiKeyId: string | null;
  authType: "api-key" | "session";
  organizationId: string;
  sessionId: string | null;
  tenantId: string;
  userId: string;
}

export interface SessionTokens {
  csrfToken: string;
  expiresAt: Date;
  refreshToken: string;
  token: string;
}

function rolePriority(role: Role): number {
  switch (role) {
    case Role.SUPER_ADMIN:
      return 5;
    case Role.OWNER:
      return 4;
    case Role.ADMIN:
      return 3;
    case Role.MEMBER:
      return 2;
    case Role.READONLY:
      return 1;
    default:
      return 0;
  }
}

export function canManageRole(currentRole: Role, targetRole: Role): boolean {
  if (currentRole === Role.SUPER_ADMIN) {
    return true;
  }

  if (currentRole === Role.OWNER) {
    return true;
  }

  if (currentRole === Role.ADMIN) {
    return targetRole === Role.MEMBER || targetRole === Role.READONLY;
  }

  return false;
}

export async function resolveOrganizationId(tenantId: string): Promise<string | null> {
  const organization = await findOrganizationByReference(tenantId);
  return organization?.id ?? null;
}

async function resolveTenantIdForOrganization(organizationId: string): Promise<string | null> {
  const organization = await prisma.organization.findFirst({
    where: {
      OR: [{ id: organizationId }, { tenantId: organizationId }]
    }
  });

  return organization?.tenantId ?? null;
}

async function findOrganizationByReference(reference: string) {
  return prisma.organization.findFirst({
    where: {
      OR: [{ id: reference }, { slug: reference }, { tenantId: reference }]
    }
  });
}

export async function resolveAuthorizedTenantContext(input: {
  tenantReference: string;
  userId: string;
}): Promise<
  | { status: "forbidden" }
  | { status: "not-found" }
  | {
      status: "ok";
      organizationId: string;
      role: Role;
      tenantId: string;
      tenantSlug: string | null;
    }
> {
  const organization = await findOrganizationByReference(input.tenantReference);

  if (!organization) {
    return { status: "not-found" };
  }

  const membership = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: input.userId
      }
    }
  });

  if (!membership || membership.status !== MembershipStatus.ACTIVE) {
    return { status: "forbidden" };
  }

  return {
    organizationId: organization.id,
    role: membership.role,
    status: "ok",
    tenantId: organization.tenantId,
    tenantSlug: organization.slug ?? null
  };
}

function nowPlusHours(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function nowPlusMinutes(minutes: number): Date {
  return new Date(Date.now() + minutes * 60 * 1000);
}

export async function createSession(input: {
  config: ApiConfig;
  ipAddress: string | null;
  organizationId: string;
  tenantId: string;
  userAgent: string | null;
  userId: string;
}): Promise<{ sessionId: string; tokens: SessionTokens }> {
  const accessToken = createAccessToken();
  const refreshToken = createRefreshToken();
  const csrfToken = randomToken(24);
  const expiresAt = nowPlusMinutes(input.config.API_AUTH_TOKEN_TTL_MINUTES);
  const refreshExpiresAt = nowPlusHours(input.config.API_AUTH_SESSION_TTL_HOURS);

  const created = await prisma.session.create({
    data: {
      csrfToken,
      expiresAt,
      ipAddress: input.ipAddress,
      organizationId: input.organizationId,
      refreshExpiresAt,
      refreshTokenHash: sha256(refreshToken),
      tenantId: input.tenantId,
      token: sha256(accessToken),
      userAgent: input.userAgent,
      userId: input.userId
    }
  });

  return {
    sessionId: created.id,
    tokens: {
      csrfToken,
      expiresAt,
      refreshToken,
      token: accessToken
    }
  };
}

async function revokeAllSessionsForIdentity(input: {
  organizationId: string;
  userId: string;
}): Promise<number> {
  const result = await prisma.session.updateMany({
    data: {
      revokedAt: new Date()
    },
    where: {
      organizationId: input.organizationId,
      revokedAt: null,
      userId: input.userId
    }
  });

  return result.count;
}

async function createNewDeviceAlert(input: {
  ipAddress: string | null;
  organizationId: string;
  tenantId: string;
  userAgent: string | null;
  userId: string;
}) {
  const latestSession = await prisma.session.findFirst({
    orderBy: {
      createdAt: "desc"
    },
    where: {
      organizationId: input.organizationId,
      userId: input.userId
    }
  });

  if (!latestSession) {
    return;
  }

  if (
    latestSession.ipAddress !== input.ipAddress ||
    latestSession.userAgent !== input.userAgent
  ) {
    await prisma.loginAlert.create({
      data: {
        ipAddress: input.ipAddress,
        organizationId: input.organizationId,
        tenantId: input.tenantId,
        userAgent: input.userAgent,
        userId: input.userId
      }
    });
  }
}

export async function loginWithPassword(input: {
  config: ApiConfig;
  email: string;
  ipAddress: string | null;
  organizationId: string;
  password: string;
  userAgent: string | null;
}): Promise<
  | {
      challengeExpiresAt: Date;
      challengeToken: string;
      mfaRequired: true;
    }
  | {
      mfaRequired: false;
      organizationId: string;
      sessionId: string;
      tenantId: string;
      tokens: SessionTokens;
      userId: string;
    }
> {
  const membership = await prisma.membership.findFirst({
    include: {
      user: true
    },
    where: {
      organizationId: input.organizationId,
      status: MembershipStatus.ACTIVE,
      user: {
        email: input.email
      }
    }
  });

  if (!membership) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (membership.user.status === UserStatus.SUSPENDED) {
    throw new Error("ACCOUNT_SUSPENDED");
  }

  const passwordCheck = await verifyPasswordHash(
    input.password,
    membership.user.passwordHash,
    input.config.AUTH_BCRYPT_SALT_ROUNDS
  );

  if (!passwordCheck.isValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (passwordCheck.needsRehash) {
    await prisma.user.update({
      data: {
        passwordHash: await hashPassword(
          input.password,
          input.config.AUTH_BCRYPT_SALT_ROUNDS
        )
      },
      where: {
        id: membership.userId
      }
    });
  }

  await createNewDeviceAlert({
    ipAddress: input.ipAddress,
    organizationId: input.organizationId,
    tenantId: membership.tenantId,
    userAgent: input.userAgent,
    userId: membership.userId
  });

  if (membership.user.mfaEnabled) {
    const challengeToken = `mfa_${randomToken(36)}`;
    const challengeExpiresAt = new Date(
      Date.now() + input.config.AUTH_MFA_CHALLENGE_TTL_SECONDS * 1000
    );

    await prisma.mfaChallenge.create({
      data: {
        expiresAt: challengeExpiresAt,
        organizationId: input.organizationId,
        tenantId: membership.tenantId,
        tokenHash: sha256(challengeToken),
        userId: membership.userId
      }
    });

    return {
      challengeExpiresAt,
      challengeToken,
      mfaRequired: true
    };
  }

  const session = await createSession({
    config: input.config,
    ipAddress: input.ipAddress,
    organizationId: input.organizationId,
    tenantId: membership.tenantId,
    userAgent: input.userAgent,
    userId: membership.userId
  });

  return {
    mfaRequired: false,
    organizationId: input.organizationId,
    sessionId: session.sessionId,
    tenantId: membership.tenantId,
    tokens: session.tokens,
    userId: membership.userId
  };
}

export async function verifyMfaChallenge(input: {
  challengeToken: string;
  config: ApiConfig;
  ipAddress: string | null;
  recoveryCode?: string;
  totpCode?: string;
  userAgent: string | null;
}): Promise<{
  organizationId: string;
  sessionId: string;
  tenantId: string;
  tokens: SessionTokens;
  userId: string;
}> {
  const challenge = await prisma.mfaChallenge.findUnique({
    where: {
      tokenHash: sha256(input.challengeToken)
    }
  });

  if (!challenge) {
    throw new Error("INVALID_MFA_CHALLENGE");
  }

  if (challenge.consumedAt || challenge.expiresAt.getTime() < Date.now()) {
    throw new Error("MFA_CHALLENGE_EXPIRED");
  }

  const user = await prisma.user.findUnique({
    where: {
      id: challenge.userId
    }
  });

  if (!user || !user.mfaSecret) {
    throw new Error("MFA_NOT_CONFIGURED");
  }

  let verified = false;

  if (input.totpCode) {
    const decryptedSecret = decryptTotpSecret(
      user.mfaSecret,
      input.config.AUTH_MFA_ENCRYPTION_KEY
    );
    verified = verifyTotpCode({
      clockSkewWindows: input.config.AUTH_MFA_CLOCK_SKEW_WINDOWS,
      code: input.totpCode,
      secret: decryptedSecret
    });
  }

  if (!verified && input.recoveryCode) {
    const hashed = hashRecoveryCode(input.recoveryCode);
    const recoveryCode = await prisma.mfaRecoveryCode.findFirst({
      where: {
        codeHash: hashed,
        usedAt: null,
        userId: challenge.userId
      }
    });

    if (recoveryCode) {
      await prisma.mfaRecoveryCode.update({
        data: {
          usedAt: new Date()
        },
        where: {
          id: recoveryCode.id
        }
      });
      verified = true;
    }
  }

  if (!verified) {
    throw new Error("INVALID_MFA_CODE");
  }

  await prisma.mfaChallenge.update({
    data: {
      consumedAt: new Date()
    },
    where: {
      id: challenge.id
    }
  });

  const createdSession = await createSession({
    config: input.config,
    ipAddress: input.ipAddress,
    organizationId: challenge.organizationId,
    tenantId: challenge.tenantId,
    userAgent: input.userAgent,
    userId: challenge.userId
  });

  return {
    organizationId: challenge.organizationId,
    sessionId: createdSession.sessionId,
    tenantId: challenge.tenantId,
    tokens: createdSession.tokens,
    userId: challenge.userId
  };
}

export async function setupMfaForUser(input: {
  config: ApiConfig;
  email: string;
  tenantId?: string;
  userId: string;
}) {
  const secret = generateTotpSecret();
  const encryptedSecret = encryptTotpSecret(secret, input.config.AUTH_MFA_ENCRYPTION_KEY);
  const recoveryCodes = generateRecoveryCodes();
  const hashedCodes = recoveryCodes.map((code) => hashRecoveryCode(code));
  const otpauthUrl = buildOtpauthUrl({
    accountName: input.email,
    issuer: input.config.AUTH_MFA_ISSUER,
    secret
  });
  const membership = await prisma.membership.findFirst({
    where: {
      userId: input.userId
    }
  });
  const tenantId = input.tenantId ?? membership?.tenantId;

  if (!tenantId) {
    throw new Error("TENANT_NOT_FOUND_FOR_USER");
  }

  await prisma.$transaction([
    prisma.user.update({
      data: {
        mfaEnabled: false,
        mfaSecret: encryptedSecret
      },
      where: {
        id: input.userId
      }
    }),
    prisma.mfaRecoveryCode.deleteMany({
      where: {
        userId: input.userId
      }
    }),
    prisma.mfaRecoveryCode.createMany({
      data: hashedCodes.map((codeHash) => ({
        codeHash,
        tenantId,
        userId: input.userId
      }))
    })
  ]);

  return {
    otpauthUrl,
    qrCodeDataUrl: buildQrCodeDataUrl(otpauthUrl),
    recoveryCodes
  };
}

export async function enableMfaForUser(input: {
  config: ApiConfig;
  totpCode: string;
  userId: string;
}): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: {
      id: input.userId
    }
  });

  if (!user?.mfaSecret) {
    throw new Error("MFA_NOT_CONFIGURED");
  }

  const decryptedSecret = decryptTotpSecret(
    user.mfaSecret,
    input.config.AUTH_MFA_ENCRYPTION_KEY
  );

  const isValid = verifyTotpCode({
    clockSkewWindows: input.config.AUTH_MFA_CLOCK_SKEW_WINDOWS,
    code: input.totpCode,
    secret: decryptedSecret
  });

  if (!isValid) {
    return false;
  }

  await prisma.user.update({
    data: {
      mfaEnabled: true
    },
    where: {
      id: input.userId
    }
  });

  return true;
}

export async function authenticateRequest(input: {
  apiKeyToken?: string | null;
  sessionToken?: string | null;
}): Promise<AuthenticatedContext | null> {
  if (input.apiKeyToken) {
    const apiKey = await introspectApiKey(input.apiKeyToken);

    if (!apiKey.active || !apiKey.userId || !apiKey.tenantId) {
      return null;
    }

    const organizationId = await resolveOrganizationId(apiKey.tenantId);

    if (!organizationId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: {
        id: apiKey.userId
      }
    });

    if (!user || user.status === UserStatus.SUSPENDED) {
      return null;
    }

    return {
      apiKeyId: apiKey.apiKeyId,
      authType: "api-key",
      organizationId,
      sessionId: null,
      tenantId: apiKey.tenantId,
      userId: apiKey.userId
    };
  }

  if (!input.sessionToken) {
    return null;
  }

  const hashedToken = sha256(input.sessionToken);
  const session = await prisma.session.findUnique({
    where: {
      token: hashedToken
    }
  });

  if (!session) {
    return null;
  }

  if (session.revokedAt || session.expiresAt.getTime() < Date.now()) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: session.userId
    }
  });

  if (!user || user.status === UserStatus.SUSPENDED) {
    return null;
  }

  await prisma.session.update({
    data: {
      lastActivityAt: new Date()
    },
    where: {
      id: session.id
    }
  });

  return {
    apiKeyId: null,
    authType: "session",
    organizationId: session.organizationId,
    sessionId: session.id,
    tenantId: session.tenantId,
    userId: session.userId
  };
}

export async function refreshSession(input: {
  config: ApiConfig;
  ipAddress: string | null;
  refreshToken: string;
  userAgent: string | null;
}): Promise<{
  breached: boolean;
  organizationId?: string;
  sessionId?: string;
  tenantId?: string;
  tokens?: SessionTokens;
  userId?: string;
}> {
  const refreshTokenHash = sha256(input.refreshToken);

  const current = await prisma.session.findUnique({
    where: {
      refreshTokenHash
    }
  });

  if (!current) {
    const revokedSession = await prisma.session.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: {
          not: null
        }
      }
    });

    if (revokedSession) {
      await revokeAllSessionsForIdentity({
        organizationId: revokedSession.organizationId,
        userId: revokedSession.userId
      });

      return {
        breached: true
      };
    }

    return {
      breached: false
    };
  }

  if (
    current.revokedAt ||
    !current.refreshExpiresAt ||
    current.refreshExpiresAt.getTime() < Date.now()
  ) {
    return {
      breached: false
    };
  }

  const nextSession = await createSession({
    config: input.config,
    ipAddress: input.ipAddress,
    organizationId: current.organizationId,
    tenantId: current.tenantId,
    userAgent: input.userAgent,
    userId: current.userId
  });

  await prisma.session.update({
    data: {
      replacedBySessionId: nextSession.sessionId,
      revokedAt: new Date()
    },
    where: {
      id: current.id
    }
  });

  return {
    breached: false,
    organizationId: current.organizationId,
    sessionId: nextSession.sessionId,
    tenantId: current.tenantId,
    tokens: nextSession.tokens,
    userId: current.userId
  };
}

export async function revokeCurrentSession(sessionId: string): Promise<void> {
  await prisma.session.update({
    data: {
      revokedAt: new Date()
    },
    where: {
      id: sessionId
    }
  });
}

export async function revokeAllSessions(input: {
  organizationId: string;
  userId: string;
}): Promise<number> {
  return revokeAllSessionsForIdentity(input);
}

export async function listActiveSessions(input: {
  organizationId: string;
  userId: string;
}) {
  return prisma.session.findMany({
    orderBy: {
      lastActivityAt: "desc"
    },
    select: {
      id: true,
      ipAddress: true,
      lastActivityAt: true,
      userAgent: true
    },
    where: {
      organizationId: input.organizationId,
      revokedAt: null,
      userId: input.userId
    }
  });
}

export async function revokeSessionById(input: {
  organizationId: string;
  sessionId: string;
  userId: string;
}) {
  const result = await prisma.session.updateMany({
    data: {
      revokedAt: new Date()
    },
    where: {
      id: input.sessionId,
      organizationId: input.organizationId,
      userId: input.userId
    }
  });

  return result.count;
}

export async function getRoleForUser(input: {
  organizationId: string;
  userId: string;
}): Promise<Role | null> {
  const membership = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId
      }
    },
    select: {
      role: true,
      status: true
    }
  });

  if (!membership || membership.status !== MembershipStatus.ACTIVE) {
    return null;
  }

  return membership.role;
}

export async function assertRole(input: {
  minimumRole: Role;
  organizationId: string;
  userId: string;
}): Promise<boolean> {
  const role = await getRoleForUser({
    organizationId: input.organizationId,
    userId: input.userId
  });

  if (!role) {
    return false;
  }

  return rolePriority(role) >= rolePriority(input.minimumRole);
}

export async function createTenantApiKey(input: {
  config: ApiConfig;
  label: string;
  organizationId: string;
  scopes: ApiKeyScope[];
  userId: string;
}) {
  const tenantId = await resolveTenantIdForOrganization(input.organizationId);

  if (!tenantId) {
    throw new Error("TENANT_NOT_FOUND");
  }

  const generated = createApiKey(input.config.API_KEY_PREFIX);
  const record = await prisma.apiKey.create({
    data: {
      keyHash: generated.hash,
      label: input.label,
      last4: generated.last4,
      organizationId: input.organizationId,
      prefix: generated.prefix,
      scopes: input.scopes,
      tenantId,
      userId: input.userId
    }
  });

  return {
    id: record.id,
    key: generated.key
  };
}

export async function listTenantApiKeys(input: {
  organizationId: string;
  userId: string;
}) {
  return prisma.apiKey.findMany({
    orderBy: {
      createdAt: "desc"
    },
    select: {
      createdAt: true,
      id: true,
      label: true,
      last4: true,
      scopes: true,
      status: true
    },
    where: {
      organizationId: input.organizationId,
      userId: input.userId
    }
  });
}

export async function rotateTenantApiKey(input: {
  config: ApiConfig;
  id: string;
  organizationId: string;
  userId: string;
}) {
  const current = await prisma.apiKey.findFirst({
    where: {
      id: input.id,
      organizationId: input.organizationId,
      userId: input.userId
    }
  });

  if (!current) {
    throw new Error("API_KEY_NOT_FOUND");
  }

  const generated = createApiKey(input.config.API_KEY_PREFIX);
  const graceExpiresAt = new Date(
    Date.now() + input.config.API_AUTH_ROTATION_GRACE_HOURS * 60 * 60 * 1000
  );

  const next = await prisma.$transaction(async (tx) => {
    await tx.apiKey.update({
      data: {
        graceExpiresAt,
        revokedAt: null,
        status: ApiKeyStatus.ACTIVE
      },
      where: {
        id: current.id
      }
    });

    return tx.apiKey.create({
      data: {
        keyHash: generated.hash,
        label: current.label,
        last4: generated.last4,
        organizationId: current.organizationId,
        prefix: current.prefix,
        rotatedFromId: current.id,
        scopes: current.scopes,
        tenantId: current.tenantId,
        userId: current.userId
      }
    });
  });

  return {
    id: next.id,
    key: generated.key
  };
}

export async function revokeTenantApiKey(input: {
  id: string;
  organizationId: string;
  userId: string;
}) {
  await prisma.apiKey.updateMany({
    data: {
      revokedAt: new Date(),
      status: ApiKeyStatus.REVOKED
    },
    where: {
      id: input.id,
      organizationId: input.organizationId,
      userId: input.userId
    }
  });
}

export async function introspectApiKey(rawToken: string): Promise<{
  active: boolean;
  apiKeyId: string | null;
  scopes: ApiKeyScope[];
  tenantId: string | null;
  userId: string | null;
}> {
  const hashed = sha256(rawToken);
  const apiKey = await prisma.apiKey.findUnique({
    where: {
      keyHash: hashed
    }
  });

  if (!apiKey) {
    return {
      active: false,
      apiKeyId: null,
      scopes: [],
      tenantId: null,
      userId: null
    };
  }

  const now = Date.now();
  const expired =
    (apiKey.expiresAt && apiKey.expiresAt.getTime() < now) ||
    (apiKey.graceExpiresAt && apiKey.graceExpiresAt.getTime() < now);
  const revoked = apiKey.status === ApiKeyStatus.REVOKED || Boolean(apiKey.revokedAt);

  if (expired || revoked) {
    return {
      active: false,
      apiKeyId: apiKey.id,
      scopes: [],
      tenantId: null,
      userId: null
    };
  }

  await prisma.apiKey.update({
    data: {
      lastUsedAt: new Date()
    },
    where: {
      id: apiKey.id
    }
  });

  return {
    active: true,
    apiKeyId: apiKey.id,
    scopes: apiKey.scopes as ApiKeyScope[],
    tenantId: apiKey.tenantId,
    userId: apiKey.userId
  };
}

export async function verifyApiKeyScope(input: {
  requiredScope: ApiKeyScope;
  token: string;
}): Promise<boolean> {
  const introspection = await introspectApiKey(input.token);

  return introspection.active && introspection.scopes.includes(input.requiredScope);
}

export async function suspendUser(input: {
  actorUserId: string;
  organizationId: string;
  targetUserId: string;
}) {
  const before = await prisma.user.findUnique({
    where: {
      id: input.targetUserId
    }
  });

  if (!before) {
    throw new Error("USER_NOT_FOUND");
  }

  const updated = await prisma.user.update({
    data: {
      status: UserStatus.SUSPENDED,
      suspendedAt: new Date()
    },
    where: {
      id: input.targetUserId
    }
  });
  const tenantId =
    (await resolveTenantIdForOrganization(input.organizationId)) ?? input.organizationId;

  await prisma.auditLog.create({
    data: {
      action: "user.suspended",
      actorId: input.actorUserId,
      diff: {
        after: {
          status: updated.status
        },
        before: {
          status: before.status
        }
      },
      entityId: input.targetUserId,
      entityType: "user",
      tenantId
    }
  });
}

export async function updateUserRoleWithAudit(input: {
  actorUserId: string;
  organizationId: string;
  role: Role;
  targetUserId: string;
}) {
  const before = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.targetUserId
      }
    }
  });

  if (!before) {
    throw new Error("MEMBERSHIP_NOT_FOUND");
  }

  const updated = await prisma.membership.update({
    data: {
      role: input.role
    },
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.targetUserId
      }
    }
  });
  const tenantId =
    (await resolveTenantIdForOrganization(input.organizationId)) ?? input.organizationId;

  await prisma.auditLog.create({
    data: {
      action: "membership.role.updated",
      actorId: input.actorUserId,
      diff: {
        after: {
          role: updated.role
        },
        before: {
          role: before.role
        }
      },
      entityId: input.targetUserId,
      entityType: "membership",
      tenantId
    }
  });

  return updated;
}
