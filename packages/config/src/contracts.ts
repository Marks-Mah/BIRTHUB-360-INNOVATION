import { z } from "zod";

export const roleSchema = z.enum(["OWNER", "ADMIN", "MEMBER", "READONLY"]);
export const userStatusSchema = z.enum(["ACTIVE", "SUSPENDED"]);
export const apiKeyScopeSchema = z.enum([
  "agents:read",
  "agents:write",
  "workflows:trigger",
  "webhooks:receive"
]);

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantId: z.string().min(1)
});

export const mfaVerifyRequestSchema = z
  .object({
    challengeToken: z.string().min(10),
    recoveryCode: z.string().trim().min(6).optional(),
    totpCode: z.string().regex(/^\d{6}$/).optional()
  })
  .refine((value) => Boolean(value.totpCode || value.recoveryCode), {
    message: "totpCode or recoveryCode is required."
  });

export const sessionSchema = z.object({
  csrfToken: z.string(),
  expiresAt: z.string(),
  id: z.string(),
  refreshToken: z.string(),
  tenantId: z.string(),
  token: z.string(),
  userId: z.string()
});

export const loginResponseSchema = z.object({
  challengeExpiresAt: z.string().optional(),
  challengeToken: z.string().optional(),
  mfaRequired: z.boolean(),
  requestId: z.string(),
  session: sessionSchema.optional()
});

export const logoutResponseSchema = z.object({
  requestId: z.string(),
  revokedSessions: z.number().int().nonnegative()
});

export const refreshRequestSchema = z.object({
  refreshToken: z.string().min(10)
});

export const refreshResponseSchema = z.object({
  requestId: z.string(),
  session: sessionSchema
});

export const cursorPaginationQuerySchema = z.object({
  cursor: z.string().optional(),
  take: z.coerce.number().int().min(1).max(100).default(25)
});

export const createOrganizationRequestSchema = z.object({
  adminEmail: z.string().email(),
  adminName: z.string().min(2),
  adminPassword: z.string().min(12),
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/)
});

export const createOrganizationResponseSchema = z.object({
  organizationId: z.string(),
  ownerUserId: z.string(),
  requestId: z.string(),
  role: z.literal("OWNER"),
  slug: z.string().optional(),
  tenantId: z.string().optional()
});

export const createInviteRequestSchema = z.object({
  email: z.string().email(),
  expiresAt: z.string().datetime().optional(),
  role: roleSchema.default("MEMBER")
});

export const acceptInviteRequestSchema = z.object({
  name: z.string().min(2).optional(),
  token: z.string().min(10),
  userId: z.string().optional()
});

export const executionModeSchema = z.enum(["LIVE", "DRY_RUN"]);
export const taskTypeSchema = z.enum(["sync-session", "send-welcome-email", "refresh-health"]);

export const taskRequestSchema = z.object({
  agentId: z.string().min(1).default("ceo-pack"),
  approvalRequired: z.boolean().default(false),
  estimatedCostBRL: z.number().nonnegative().default(0.5),
  executionMode: executionModeSchema.default("LIVE"),
  payload: z.record(z.string(), z.unknown()).default({}),
  type: taskTypeSchema
});

export const jobContextSchema = z.object({
  actorId: z.string().min(1),
  jobId: z.string().min(1),
  scopedAt: z.string().datetime(),
  tenantId: z.string().min(1)
});

export const taskJobSchema = z.object({
  agentId: z.string().min(1).default("ceo-pack"),
  approvalRequired: z.boolean().default(false),
  context: jobContextSchema.optional(),
  estimatedCostBRL: z.number().nonnegative().default(0.5),
  executionMode: executionModeSchema.default("LIVE"),
  payload: z.record(z.string(), z.unknown()),
  requestId: z.string(),
  signature: z.string().min(8).default("unsigned"),
  tenantId: z.string().nullable(),
  type: taskTypeSchema,
  userId: z.string().nullable(),
  version: z.literal("1")
});

export const taskEnqueuedResponseSchema = z.object({
  jobId: z.string(),
  requestId: z.string()
});

export const healthResponseSchema = z.object({
  checkedAt: z.string(),
  services: z.object({
    database: z.object({
      message: z.string().optional(),
      status: z.enum(["up", "down"])
    }),
    externalDependencies: z.array(
      z.object({
        name: z.string(),
        status: z.enum(["up", "down"])
      })
    ),
    redis: z.object({
      message: z.string().optional(),
      status: z.enum(["up", "down"])
    })
  }),
  status: z.enum(["ok", "degraded"])
});

export const authIntrospectionResponseSchema = z.object({
  active: z.boolean(),
  requestId: z.string(),
  scopes: z.array(apiKeyScopeSchema),
  tenantId: z.string().nullable(),
  userId: z.string().nullable()
});

export const apiKeyCreateRequestSchema = z.object({
  label: z.string().min(2),
  scopes: z.array(apiKeyScopeSchema).min(1)
});

export const apiKeyCreateResponseSchema = z.object({
  apiKey: z.string(),
  id: z.string(),
  requestId: z.string()
});

export const apiKeyListItemSchema = z.object({
  createdAt: z.string(),
  id: z.string(),
  label: z.string(),
  last4: z.string(),
  scopes: z.array(apiKeyScopeSchema),
  status: z.enum(["ACTIVE", "REVOKED"])
});

export const apiKeyListResponseSchema = z.object({
  items: z.array(apiKeyListItemSchema),
  requestId: z.string()
});

export const sessionListItemSchema = z.object({
  id: z.string(),
  ipAddress: z.string().nullable(),
  lastActivityAt: z.string(),
  userAgent: z.string().nullable()
});

export const sessionListResponseSchema = z.object({
  items: z.array(sessionListItemSchema),
  requestId: z.string()
});

export const roleUpdateRequestSchema = z.object({
  role: roleSchema
});

export const userListQuerySchema = z.object({
  role: roleSchema.optional(),
  search: z.string().optional(),
  status: userStatusSchema.optional()
});

export const privacyDeleteRequestSchema = z.object({
  confirmationText: z.string().min(5)
});

export const privacyDeleteResponseSchema = z.object({
  anonymizedEmail: z.string().email(),
  billingCancelled: z.boolean(),
  requestId: z.string()
});
