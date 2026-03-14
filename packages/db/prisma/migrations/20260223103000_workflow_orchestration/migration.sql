-- Workflow orchestration persistence
CREATE TYPE "WorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');
CREATE TYPE "AgentTaskStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

CREATE TABLE "Workflow" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "status" "WorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "definition" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workflow_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AgentTask" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "agentName" TEXT NOT NULL,
    "status" "AgentTaskStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" INTEGER NOT NULL DEFAULT 5,
    "input" JSONB,
    "output" JSONB,
    "error" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Workflow_tenantId_key_key" ON "Workflow"("tenantId", "key");
CREATE INDEX "AgentTask_tenantId_status_createdAt_idx" ON "AgentTask"("tenantId", "status", "createdAt");
CREATE INDEX "AgentTask_workflowId_status_idx" ON "AgentTask"("workflowId", "status");

ALTER TABLE "Workflow"
    ADD CONSTRAINT "Workflow_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentTask"
    ADD CONSTRAINT "AgentTask_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AgentTask"
    ADD CONSTRAINT "AgentTask_workflowId_fkey"
    FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
