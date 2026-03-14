ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

CREATE TYPE "NotificationType" AS ENUM (
  'INFO',
  'SUCCESS',
  'WARNING',
  'FAILED',
  'WORKFLOW_COMPLETED',
  'CRITICAL_ERROR',
  'AGENT_FAILED',
  'CHURN_RISK'
);

CREATE TYPE "CookieConsentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
CREATE TYPE "AgentExecutionStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'WAITING_APPROVAL');
CREATE TYPE "ExecutionSource" AS ENUM ('MANUAL', 'WORKFLOW', 'INTERNAL');
CREATE TYPE "WebhookEndpointStatus" AS ENUM ('ACTIVE', 'DISABLED');

ALTER TABLE "organizations"
  ADD COLUMN "primary_domain" TEXT,
  ADD COLUMN "hubspot_company_id" TEXT,
  ADD COLUMN "health_score" INTEGER NOT NULL DEFAULT 100;

CREATE UNIQUE INDEX "organizations_hubspot_company_id_key" ON "organizations"("hubspot_company_id");
CREATE INDEX "organizations_primary_domain_idx" ON "organizations"("primary_domain");
CREATE INDEX "organizations_hubspot_company_id_idx" ON "organizations"("hubspot_company_id");
CREATE INDEX "organizations_health_score_idx" ON "organizations"("health_score");

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" "NotificationType" NOT NULL,
  "content" TEXT NOT NULL,
  "link" TEXT,
  "metadata" JSONB,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_tenantId_idx" ON "notifications"("tenantId");
CREATE INDEX "notifications_tenantId_createdAt_idx" ON "notifications"("tenantId", "createdAt");
CREATE INDEX "notifications_tenantId_userId_idx" ON "notifications"("tenantId", "userId");
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "user_preferences" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "in_app_notifications" BOOLEAN NOT NULL DEFAULT true,
  "email_notifications" BOOLEAN NOT NULL DEFAULT true,
  "marketing_emails" BOOLEAN NOT NULL DEFAULT false,
  "push_notifications" BOOLEAN NOT NULL DEFAULT false,
  "cookie_consent" "CookieConsentStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_preferences_organizationId_userId_key" ON "user_preferences"("organizationId", "userId");
CREATE INDEX "user_preferences_tenantId_idx" ON "user_preferences"("tenantId");
CREATE INDEX "user_preferences_tenantId_userId_idx" ON "user_preferences"("tenantId", "userId");

ALTER TABLE "user_preferences"
  ADD CONSTRAINT "user_preferences_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_preferences"
  ADD CONSTRAINT "user_preferences_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "agent_executions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT,
  "userId" TEXT,
  "agentId" TEXT NOT NULL,
  "status" "AgentExecutionStatus" NOT NULL DEFAULT 'RUNNING',
  "source" "ExecutionSource" NOT NULL DEFAULT 'MANUAL',
  "input" JSONB,
  "output" JSONB,
  "output_hash" TEXT,
  "error_message" TEXT,
  "metadata" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agent_executions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "agent_executions_tenantId_idx" ON "agent_executions"("tenantId");
CREATE INDEX "agent_executions_tenantId_createdAt_idx" ON "agent_executions"("tenantId", "createdAt");
CREATE INDEX "agent_executions_tenantId_agentId_idx" ON "agent_executions"("tenantId", "agentId");
CREATE INDEX "agent_executions_tenantId_status_idx" ON "agent_executions"("tenantId", "status");
CREATE INDEX "agent_executions_organizationId_userId_idx" ON "agent_executions"("organizationId", "userId");

ALTER TABLE "agent_executions"
  ADD CONSTRAINT "agent_executions_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "agent_executions"
  ADD CONSTRAINT "agent_executions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "agent_feedback" (
  "id" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT,
  "userId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "notes" TEXT,
  "expected_output" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agent_feedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_feedback_executionId_userId_key" ON "agent_feedback"("executionId", "userId");
CREATE INDEX "agent_feedback_tenantId_idx" ON "agent_feedback"("tenantId");
CREATE INDEX "agent_feedback_tenantId_agentId_idx" ON "agent_feedback"("tenantId", "agentId");
CREATE INDEX "agent_feedback_tenantId_rating_idx" ON "agent_feedback"("tenantId", "rating");

ALTER TABLE "agent_feedback"
  ADD CONSTRAINT "agent_feedback_executionId_fkey"
  FOREIGN KEY ("executionId") REFERENCES "agent_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_feedback"
  ADD CONSTRAINT "agent_feedback_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "agent_feedback"
  ADD CONSTRAINT "agent_feedback_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "tenant_activity_windows" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "windowDays" INTEGER NOT NULL,
  "active_users" INTEGER NOT NULL DEFAULT 0,
  "login_count" INTEGER NOT NULL DEFAULT 0,
  "agent_runs" INTEGER NOT NULL DEFAULT 0,
  "workflow_runs" INTEGER NOT NULL DEFAULT 0,
  "billing_errors" INTEGER NOT NULL DEFAULT 0,
  "run_failures" INTEGER NOT NULL DEFAULT 0,
  "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "tenant_activity_windows_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_activity_windows_tenantId_windowDays_key" ON "tenant_activity_windows"("tenantId", "windowDays");
CREATE INDEX "tenant_activity_windows_organizationId_windowDays_idx" ON "tenant_activity_windows"("organizationId", "windowDays");

ALTER TABLE "tenant_activity_windows"
  ADD CONSTRAINT "tenant_activity_windows_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "webhook_endpoints" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "createdByUserId" TEXT,
  "url" TEXT NOT NULL,
  "secret" TEXT NOT NULL,
  "topics" TEXT[] NOT NULL,
  "status" "WebhookEndpointStatus" NOT NULL DEFAULT 'ACTIVE',
  "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
  "last_delivered_at" TIMESTAMP(3),
  "last_failure_at" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "webhook_endpoints_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhook_endpoints_tenantId_idx" ON "webhook_endpoints"("tenantId");
CREATE INDEX "webhook_endpoints_tenantId_status_idx" ON "webhook_endpoints"("tenantId", "status");
CREATE INDEX "webhook_endpoints_organizationId_createdAt_idx" ON "webhook_endpoints"("organizationId", "createdAt");

ALTER TABLE "webhook_endpoints"
  ADD CONSTRAINT "webhook_endpoints_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "webhook_endpoints"
  ADD CONSTRAINT "webhook_endpoints_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "webhook_deliveries" (
  "id" TEXT NOT NULL,
  "endpointId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "signature" TEXT NOT NULL,
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "success" BOOLEAN NOT NULL DEFAULT false,
  "status_code" INTEGER,
  "response_body" TEXT,
  "error_message" TEXT,
  "delivered_at" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "webhook_deliveries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhook_deliveries_tenantId_idx" ON "webhook_deliveries"("tenantId");
CREATE INDEX "webhook_deliveries_tenantId_topic_createdAt_idx" ON "webhook_deliveries"("tenantId", "topic", "createdAt");
CREATE INDEX "webhook_deliveries_endpointId_createdAt_idx" ON "webhook_deliveries"("endpointId", "createdAt");
CREATE INDEX "webhook_deliveries_organizationId_createdAt_idx" ON "webhook_deliveries"("organizationId", "createdAt");

ALTER TABLE "webhook_deliveries"
  ADD CONSTRAINT "webhook_deliveries_endpointId_fkey"
  FOREIGN KEY ("endpointId") REFERENCES "webhook_endpoints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "webhook_deliveries"
  ADD CONSTRAINT "webhook_deliveries_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "dataset_exports" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "organizationId" TEXT,
  "file_name" TEXT NOT NULL,
  "record_count" INTEGER NOT NULL DEFAULT 0,
  "dataset_hash" TEXT NOT NULL,
  "storage_url" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dataset_exports_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dataset_exports_tenantId_idx" ON "dataset_exports"("tenantId");
CREATE INDEX "dataset_exports_createdAt_idx" ON "dataset_exports"("createdAt");

ALTER TABLE "dataset_exports"
  ADD CONSTRAINT "dataset_exports_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "crm_sync_events" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'hubspot',
  "direction" TEXT NOT NULL DEFAULT 'outbound',
  "event_type" TEXT NOT NULL,
  "request_body" JSONB NOT NULL,
  "response_status" INTEGER,
  "response_body" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "crm_sync_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "crm_sync_events_tenantId_idx" ON "crm_sync_events"("tenantId");
CREATE INDEX "crm_sync_events_organizationId_createdAt_idx" ON "crm_sync_events"("organizationId", "createdAt");

ALTER TABLE "crm_sync_events"
  ADD CONSTRAINT "crm_sync_events_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
