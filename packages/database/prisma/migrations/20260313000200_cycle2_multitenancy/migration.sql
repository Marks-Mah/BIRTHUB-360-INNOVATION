CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'REVOKED');
CREATE TYPE "SessionStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
CREATE TYPE "AgentStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED');
CREATE TYPE "QuotaResourceType" AS ENUM ('EMAILS_SENT', 'AI_PROMPTS', 'WORKFLOW_RUNS', 'STORAGE_GB', 'API_REQUESTS');

ALTER TABLE "Organization" RENAME TO "organizations";
ALTER TABLE "User" RENAME TO "users";
ALTER TABLE "Membership" RENAME TO "members";
ALTER TABLE "Session" RENAME TO "sessions";

ALTER TABLE "organizations"
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "settings" JSONB;

UPDATE "organizations"
SET "tenantId" = COALESCE("tenantId", "id");

ALTER TABLE "organizations"
  ALTER COLUMN "tenantId" SET NOT NULL;

CREATE UNIQUE INDEX "organizations_tenantId_key" ON "organizations"("tenantId");
CREATE INDEX "organizations_tenantId_idx" ON "organizations"("tenantId");
CREATE INDEX "organizations_tenantId_id_idx" ON "organizations"("tenantId", "id");
CREATE INDEX "organizations_tenantId_slug_idx" ON "organizations"("tenantId", "slug");

ALTER TABLE "members"
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "members" m
SET "tenantId" = o."tenantId"
FROM "organizations" o
WHERE m."organizationId" = o."id";

ALTER TABLE "members"
  ALTER COLUMN "tenantId" SET NOT NULL;

CREATE INDEX "members_tenantId_idx" ON "members"("tenantId");
CREATE INDEX "members_tenantId_id_idx" ON "members"("tenantId", "id");
CREATE INDEX "members_tenantId_userId_idx" ON "members"("tenantId", "userId");
CREATE INDEX "members_tenantId_status_idx" ON "members"("tenantId", "status");

ALTER TABLE "sessions"
  ADD COLUMN "tenantId" TEXT,
  ADD COLUMN "status" "SessionStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "sessions" s
SET "tenantId" = o."tenantId"
FROM "organizations" o
WHERE s."organizationId" = o."id";

ALTER TABLE "sessions"
  ALTER COLUMN "tenantId" SET NOT NULL;

CREATE INDEX "sessions_tenantId_idx" ON "sessions"("tenantId");
CREATE INDEX "sessions_tenantId_id_idx" ON "sessions"("tenantId", "id");
CREATE INDEX "sessions_tenantId_userId_idx" ON "sessions"("tenantId", "userId");
CREATE INDEX "sessions_tenantId_status_idx" ON "sessions"("tenantId", "status");

CREATE TABLE "agents" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "AgentStatus" NOT NULL DEFAULT 'ACTIVE',
  "config" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflows" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
  "definition" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workflows_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customers" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invites" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "role" "Role" NOT NULL DEFAULT 'MEMBER',
  "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
  "invitedByUserId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "invites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_logs" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "diff" JSONB NOT NULL,
  "ip" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "quota_usage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "resourceType" "QuotaResourceType" NOT NULL,
  "period" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "limit" INTEGER NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quota_usage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "subscriptions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "plan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
  "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  "renewsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agents_tenantId_name_key" ON "agents"("tenantId", "name");
CREATE UNIQUE INDEX "workflows_tenantId_name_key" ON "workflows"("tenantId", "name");
CREATE UNIQUE INDEX "customers_tenantId_email_key" ON "customers"("tenantId", "email");
CREATE UNIQUE INDEX "invites_token_key" ON "invites"("token");
CREATE UNIQUE INDEX "quota_usage_tenantId_resourceType_period_key" ON "quota_usage"("tenantId", "resourceType", "period");
CREATE UNIQUE INDEX "subscriptions_organizationId_key" ON "subscriptions"("organizationId");

CREATE INDEX "agents_tenantId_idx" ON "agents"("tenantId");
CREATE INDEX "agents_tenantId_id_idx" ON "agents"("tenantId", "id");
CREATE INDEX "agents_tenantId_status_idx" ON "agents"("tenantId", "status");

CREATE INDEX "workflows_tenantId_idx" ON "workflows"("tenantId");
CREATE INDEX "workflows_tenantId_id_idx" ON "workflows"("tenantId", "id");
CREATE INDEX "workflows_tenantId_status_idx" ON "workflows"("tenantId", "status");

CREATE INDEX "customers_tenantId_idx" ON "customers"("tenantId");
CREATE INDEX "customers_tenantId_id_idx" ON "customers"("tenantId", "id");
CREATE INDEX "customers_tenantId_status_idx" ON "customers"("tenantId", "status");

CREATE INDEX "invites_tenantId_idx" ON "invites"("tenantId");
CREATE INDEX "invites_tenantId_id_idx" ON "invites"("tenantId", "id");
CREATE INDEX "invites_tenantId_status_idx" ON "invites"("tenantId", "status");
CREATE INDEX "invites_expiresAt_idx" ON "invites"("expiresAt");

CREATE INDEX "audit_logs_tenantId_idx" ON "audit_logs"("tenantId");
CREATE INDEX "audit_logs_tenantId_id_idx" ON "audit_logs"("tenantId", "id");
CREATE INDEX "audit_logs_tenantId_createdAt_idx" ON "audit_logs"("tenantId", "createdAt");
CREATE INDEX "audit_logs_tenantId_actorId_idx" ON "audit_logs"("tenantId", "actorId");

CREATE INDEX "quota_usage_tenantId_idx" ON "quota_usage"("tenantId");
CREATE INDEX "quota_usage_tenantId_id_idx" ON "quota_usage"("tenantId", "id");
CREATE INDEX "quota_usage_tenantId_resourceType_idx" ON "quota_usage"("tenantId", "resourceType");
CREATE INDEX "quota_usage_tenantId_period_idx" ON "quota_usage"("tenantId", "period");

CREATE INDEX "subscriptions_tenantId_idx" ON "subscriptions"("tenantId");
CREATE INDEX "subscriptions_tenantId_id_idx" ON "subscriptions"("tenantId", "id");
CREATE INDEX "subscriptions_tenantId_status_idx" ON "subscriptions"("tenantId", "status");

ALTER TABLE "agents"
  ADD CONSTRAINT "agents_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflows"
  ADD CONSTRAINT "workflows_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customers"
  ADD CONSTRAINT "customers_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invites"
  ADD CONSTRAINT "invites_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invites"
  ADD CONSTRAINT "invites_invitedByUserId_fkey"
  FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS TEXT
LANGUAGE SQL
STABLE
AS $$
  SELECT NULLIF(current_setting('app.current_tenant_id', true), '');
$$;

ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "organizations" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy_organizations ON "organizations"
  FOR ALL
  USING ("tenantId" = get_current_tenant_id())
  WITH CHECK ("tenantId" = get_current_tenant_id());

ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "members" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy_members ON "members"
  FOR ALL
  USING ("tenantId" = get_current_tenant_id())
  WITH CHECK ("tenantId" = get_current_tenant_id());

ALTER TABLE "agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agents" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy_agents ON "agents"
  FOR ALL
  USING ("tenantId" = get_current_tenant_id())
  WITH CHECK ("tenantId" = get_current_tenant_id());

ALTER TABLE "workflows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflows" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy_workflows ON "workflows"
  FOR ALL
  USING ("tenantId" = get_current_tenant_id())
  WITH CHECK ("tenantId" = get_current_tenant_id());
