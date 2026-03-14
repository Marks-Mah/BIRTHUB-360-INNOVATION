ALTER TYPE "Role" ADD VALUE 'READONLY';

CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED');

ALTER TABLE "users"
  ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "mfaSecret" TEXT;

ALTER TABLE "sessions"
  ADD COLUMN "refreshTokenHash" TEXT,
  ADD COLUMN "csrfToken" TEXT,
  ADD COLUMN "refreshExpiresAt" TIMESTAMP(3),
  ADD COLUMN "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "revokedAt" TIMESTAMP(3),
  ADD COLUMN "replacedBySessionId" TEXT,
  ADD COLUMN "ipAddress" TEXT,
  ADD COLUMN "userAgent" TEXT;

CREATE UNIQUE INDEX "sessions_refreshTokenHash_key" ON "sessions"("refreshTokenHash");
CREATE INDEX "sessions_revokedAt_idx" ON "sessions"("revokedAt");

ALTER TABLE "sessions"
  ADD CONSTRAINT "sessions_replacedBySessionId_fkey"
  FOREIGN KEY ("replacedBySessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "api_keys" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "prefix" TEXT NOT NULL,
  "keyHash" TEXT NOT NULL,
  "last4" TEXT NOT NULL,
  "scopes" TEXT[],
  "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "graceExpiresAt" TIMESTAMP(3),
  "rotatedFromId" TEXT,
  "revokedAt" TIMESTAMP(3),
  "lastUsedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "api_keys_keyHash_key" ON "api_keys"("keyHash");
CREATE INDEX "api_keys_tenantId_idx" ON "api_keys"("tenantId");
CREATE INDEX "api_keys_tenantId_status_idx" ON "api_keys"("tenantId", "status");
CREATE INDEX "api_keys_organizationId_userId_idx" ON "api_keys"("organizationId", "userId");

ALTER TABLE "api_keys"
  ADD CONSTRAINT "api_keys_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "api_keys"
  ADD CONSTRAINT "api_keys_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "api_keys"
  ADD CONSTRAINT "api_keys_rotatedFromId_fkey"
  FOREIGN KEY ("rotatedFromId") REFERENCES "api_keys"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "mfa_recovery_codes" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mfa_recovery_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mfa_recovery_codes_userId_codeHash_key" ON "mfa_recovery_codes"("userId", "codeHash");
CREATE INDEX "mfa_recovery_codes_tenantId_idx" ON "mfa_recovery_codes"("tenantId");

ALTER TABLE "mfa_recovery_codes"
  ADD CONSTRAINT "mfa_recovery_codes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "mfa_challenges" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mfa_challenges_tokenHash_key" ON "mfa_challenges"("tokenHash");
CREATE INDEX "mfa_challenges_tenantId_idx" ON "mfa_challenges"("tenantId");
CREATE INDEX "mfa_challenges_tenantId_userId_expiresAt_idx" ON "mfa_challenges"("tenantId", "userId", "expiresAt");

ALTER TABLE "mfa_challenges"
  ADD CONSTRAINT "mfa_challenges_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "mfa_challenges"
  ADD CONSTRAINT "mfa_challenges_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "login_alerts" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "login_alerts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "login_alerts_tenantId_idx" ON "login_alerts"("tenantId");
CREATE INDEX "login_alerts_tenantId_userId_createdAt_idx" ON "login_alerts"("tenantId", "userId", "createdAt");

ALTER TABLE "login_alerts"
  ADD CONSTRAINT "login_alerts_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "login_alerts"
  ADD CONSTRAINT "login_alerts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "job_signing_secrets" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "job_signing_secrets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "job_signing_secrets_tenantId_key" ON "job_signing_secrets"("tenantId");
CREATE UNIQUE INDEX "job_signing_secrets_organizationId_key" ON "job_signing_secrets"("organizationId");
CREATE INDEX "job_signing_secrets_tenantId_idx" ON "job_signing_secrets"("tenantId");

ALTER TABLE "job_signing_secrets"
  ADD CONSTRAINT "job_signing_secrets_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
