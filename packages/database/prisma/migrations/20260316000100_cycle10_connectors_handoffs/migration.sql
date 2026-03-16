ALTER TYPE "WorkflowStepType" ADD VALUE IF NOT EXISTS 'AGENT_HANDOFF';
ALTER TYPE "WorkflowStepType" ADD VALUE IF NOT EXISTS 'CRM_UPSERT';
ALTER TYPE "WorkflowStepType" ADD VALUE IF NOT EXISTS 'WHATSAPP_SEND';
ALTER TYPE "WorkflowStepType" ADD VALUE IF NOT EXISTS 'GOOGLE_EVENT';
ALTER TYPE "WorkflowStepType" ADD VALUE IF NOT EXISTS 'MS_EVENT';

CREATE TABLE "connector_accounts" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "account_key" TEXT NOT NULL DEFAULT 'primary',
  "display_name" TEXT,
  "external_account_id" TEXT,
  "auth_type" TEXT NOT NULL DEFAULT 'oauth',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "scopes" JSONB,
  "metadata" JSONB,
  "connected_at" TIMESTAMP(3),
  "disconnected_at" TIMESTAMP(3),
  "last_sync_at" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "connector_accounts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connector_credentials" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "connector_account_id" TEXT NOT NULL,
  "credential_type" TEXT NOT NULL,
  "encrypted_value" TEXT NOT NULL,
  "expires_at" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "connector_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "connector_sync_cursors" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "connector_account_id" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "cursor" JSONB,
  "status" TEXT NOT NULL DEFAULT 'idle',
  "metadata" JSONB,
  "error_message" TEXT,
  "last_sync_at" TIMESTAMP(3),
  "next_sync_at" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "connector_sync_cursors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversation_threads" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "connector_account_id" TEXT,
  "external_thread_id" TEXT,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'open',
  "subject" TEXT,
  "correlation_id" TEXT,
  "lead_reference" TEXT,
  "customer_reference" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "conversation_threads_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "conversation_messages" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "thread_id" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "role" TEXT,
  "agent_id" TEXT,
  "external_message_id" TEXT,
  "content" JSONB NOT NULL,
  "content_preview" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_handoffs" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "thread_id" TEXT,
  "source_agent_id" TEXT NOT NULL,
  "target_agent_id" TEXT NOT NULL,
  "source_execution_id" TEXT,
  "target_execution_id" TEXT,
  "correlation_id" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'queued',
  "summary" TEXT NOT NULL,
  "context" JSONB NOT NULL,
  "result" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "agent_handoffs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "connector_accounts_organizationId_provider_account_key_key"
ON "connector_accounts"("organizationId", "provider", "account_key");

CREATE UNIQUE INDEX "connector_credentials_connector_account_id_credential_type_key"
ON "connector_credentials"("connector_account_id", "credential_type");

CREATE UNIQUE INDEX "connector_sync_cursors_connector_account_id_scope_key"
ON "connector_sync_cursors"("connector_account_id", "scope");

CREATE INDEX "connector_accounts_tenantId_idx" ON "connector_accounts"("tenantId");
CREATE INDEX "connector_accounts_tenantId_provider_status_idx"
ON "connector_accounts"("tenantId", "provider", "status");
CREATE INDEX "connector_accounts_organizationId_provider_idx"
ON "connector_accounts"("organizationId", "provider");

CREATE INDEX "connector_credentials_tenantId_idx" ON "connector_credentials"("tenantId");
CREATE INDEX "connector_credentials_organizationId_createdAt_idx"
ON "connector_credentials"("organizationId", "createdAt");

CREATE INDEX "connector_sync_cursors_tenantId_idx" ON "connector_sync_cursors"("tenantId");
CREATE INDEX "connector_sync_cursors_organizationId_scope_idx"
ON "connector_sync_cursors"("organizationId", "scope");

CREATE INDEX "conversation_threads_tenantId_idx" ON "conversation_threads"("tenantId");
CREATE INDEX "conversation_threads_tenantId_channel_status_idx"
ON "conversation_threads"("tenantId", "channel", "status");
CREATE INDEX "conversation_threads_organizationId_createdAt_idx"
ON "conversation_threads"("organizationId", "createdAt");
CREATE INDEX "conversation_threads_organizationId_correlation_id_idx"
ON "conversation_threads"("organizationId", "correlation_id");

CREATE INDEX "conversation_messages_tenantId_idx" ON "conversation_messages"("tenantId");
CREATE INDEX "conversation_messages_thread_id_createdAt_idx"
ON "conversation_messages"("thread_id", "createdAt");
CREATE INDEX "conversation_messages_organizationId_createdAt_idx"
ON "conversation_messages"("organizationId", "createdAt");

CREATE INDEX "agent_handoffs_tenantId_idx" ON "agent_handoffs"("tenantId");
CREATE INDEX "agent_handoffs_tenantId_source_agent_id_target_agent_id_idx"
ON "agent_handoffs"("tenantId", "source_agent_id", "target_agent_id");
CREATE INDEX "agent_handoffs_organizationId_correlation_id_idx"
ON "agent_handoffs"("organizationId", "correlation_id");

ALTER TABLE "connector_accounts"
ADD CONSTRAINT "connector_accounts_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "connector_credentials"
ADD CONSTRAINT "connector_credentials_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "connector_credentials"
ADD CONSTRAINT "connector_credentials_connector_account_id_fkey"
FOREIGN KEY ("connector_account_id") REFERENCES "connector_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "connector_sync_cursors"
ADD CONSTRAINT "connector_sync_cursors_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "connector_sync_cursors"
ADD CONSTRAINT "connector_sync_cursors_connector_account_id_fkey"
FOREIGN KEY ("connector_account_id") REFERENCES "connector_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversation_threads"
ADD CONSTRAINT "conversation_threads_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversation_threads"
ADD CONSTRAINT "conversation_threads_connector_account_id_fkey"
FOREIGN KEY ("connector_account_id") REFERENCES "connector_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "conversation_messages"
ADD CONSTRAINT "conversation_messages_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "conversation_messages"
ADD CONSTRAINT "conversation_messages_thread_id_fkey"
FOREIGN KEY ("thread_id") REFERENCES "conversation_threads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_handoffs"
ADD CONSTRAINT "agent_handoffs_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_handoffs"
ADD CONSTRAINT "agent_handoffs_thread_id_fkey"
FOREIGN KEY ("thread_id") REFERENCES "conversation_threads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
