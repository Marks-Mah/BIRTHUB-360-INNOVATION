CREATE TABLE "agent_budgets" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "limitBrl" DOUBLE PRECISION NOT NULL DEFAULT 100,
  "consumedBrl" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastAlertLevel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agent_budgets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agent_budget_events" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "requestId" TEXT,
  "kind" TEXT NOT NULL,
  "costBrl" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "executionMode" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "agent_budget_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "output_artifacts" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "approvedByUserId" TEXT,
  "type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "contentHash" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "output_artifacts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agent_budgets_tenantId_agentId_key" ON "agent_budgets"("tenantId", "agentId");
CREATE INDEX "agent_budgets_tenantId_idx" ON "agent_budgets"("tenantId");
CREATE INDEX "agent_budgets_organizationId_updatedAt_idx" ON "agent_budgets"("organizationId", "updatedAt");

CREATE INDEX "agent_budget_events_tenantId_idx" ON "agent_budget_events"("tenantId");
CREATE INDEX "agent_budget_events_organizationId_createdAt_idx" ON "agent_budget_events"("organizationId", "createdAt");
CREATE INDEX "agent_budget_events_tenantId_agentId_createdAt_idx" ON "agent_budget_events"("tenantId", "agentId", "createdAt");
CREATE INDEX "agent_budget_events_tenantId_actorId_createdAt_idx" ON "agent_budget_events"("tenantId", "actorId", "createdAt");

CREATE INDEX "output_artifacts_tenantId_idx" ON "output_artifacts"("tenantId");
CREATE INDEX "output_artifacts_organizationId_createdAt_idx" ON "output_artifacts"("organizationId", "createdAt");
CREATE INDEX "output_artifacts_tenantId_type_createdAt_idx" ON "output_artifacts"("tenantId", "type", "createdAt");
CREATE INDEX "output_artifacts_tenantId_status_createdAt_idx" ON "output_artifacts"("tenantId", "status", "createdAt");

ALTER TABLE "agent_budgets"
  ADD CONSTRAINT "agent_budgets_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agent_budget_events"
  ADD CONSTRAINT "agent_budget_events_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "output_artifacts"
  ADD CONSTRAINT "output_artifacts_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
