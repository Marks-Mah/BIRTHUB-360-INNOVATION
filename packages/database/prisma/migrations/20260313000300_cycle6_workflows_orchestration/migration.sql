CREATE TYPE "WorkflowStatus_new" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "WorkflowTriggerType" AS ENUM ('MANUAL', 'WEBHOOK', 'CRON', 'EVENT');
CREATE TYPE "WorkflowStepType" AS ENUM (
  'TRIGGER_WEBHOOK',
  'TRIGGER_CRON',
  'TRIGGER_EVENT',
  'HTTP_REQUEST',
  'CONDITION',
  'CODE',
  'TRANSFORMER',
  'SEND_NOTIFICATION',
  'AGENT_EXECUTE',
  'AI_TEXT_EXTRACT',
  'DELAY'
);
CREATE TYPE "WorkflowStepOnError" AS ENUM ('STOP', 'CONTINUE');
CREATE TYPE "WorkflowTransitionRoute" AS ENUM ('ALWAYS', 'IF_TRUE', 'IF_FALSE', 'ON_SUCCESS', 'ON_FAILURE', 'FALLBACK');
CREATE TYPE "WorkflowExecutionStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED', 'WAITING');
CREATE TYPE "StepResultStatus" AS ENUM ('SUCCESS', 'FAILED', 'SKIPPED', 'WAITING');

ALTER TABLE "workflows"
  ALTER COLUMN "status" DROP DEFAULT;

ALTER TABLE "workflows"
  ALTER COLUMN "status" TYPE "WorkflowStatus_new"
  USING (
    CASE
      WHEN "status"::TEXT IN ('ACTIVE', 'PAUSED') THEN 'PUBLISHED'
      ELSE "status"::TEXT
    END
  )::"WorkflowStatus_new";

DROP TYPE "WorkflowStatus";
ALTER TYPE "WorkflowStatus_new" RENAME TO "WorkflowStatus";

ALTER TABLE "workflows"
  ALTER COLUMN "status" SET DEFAULT 'DRAFT',
  ADD COLUMN "description" TEXT,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "triggerType" "WorkflowTriggerType" NOT NULL DEFAULT 'MANUAL',
  ADD COLUMN "triggerConfig" JSONB,
  ADD COLUMN "webhookSecret" TEXT,
  ADD COLUMN "cronExpression" TEXT,
  ADD COLUMN "eventTopic" TEXT,
  ADD COLUMN "maxDepth" INTEGER NOT NULL DEFAULT 50,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE INDEX "workflows_tenantId_triggerType_idx" ON "workflows"("tenantId", "triggerType");

CREATE TABLE "workflow_steps" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" "WorkflowStepType" NOT NULL,
  "config" JSONB NOT NULL,
  "onError" "WorkflowStepOnError" NOT NULL DEFAULT 'STOP',
  "cacheTTLSeconds" INTEGER,
  "timeoutMs" INTEGER NOT NULL DEFAULT 1000,
  "isTrigger" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_transitions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "sourceStepId" TEXT NOT NULL,
  "targetStepId" TEXT NOT NULL,
  "route" "WorkflowTransitionRoute" NOT NULL DEFAULT 'ALWAYS',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workflow_transitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workflow_executions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "status" "WorkflowExecutionStatus" NOT NULL DEFAULT 'RUNNING',
  "triggerType" "WorkflowTriggerType" NOT NULL,
  "triggerPayload" JSONB,
  "dedupeHash" TEXT,
  "depth" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "errorMessage" TEXT,
  "resumedFromExecutionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "workflow_executions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "step_results" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "workflowId" TEXT NOT NULL,
  "executionId" TEXT NOT NULL,
  "stepId" TEXT NOT NULL,
  "status" "StepResultStatus" NOT NULL DEFAULT 'SUCCESS',
  "attempt" INTEGER NOT NULL DEFAULT 1,
  "input" JSONB,
  "output" JSONB,
  "outputSize" INTEGER NOT NULL DEFAULT 0,
  "outputPreview" TEXT,
  "externalPayloadUrl" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "step_results_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "workflow_steps_workflowId_key_key" ON "workflow_steps"("workflowId", "key");
CREATE INDEX "workflow_steps_tenantId_idx" ON "workflow_steps"("tenantId");
CREATE INDEX "workflow_steps_tenantId_id_idx" ON "workflow_steps"("tenantId", "id");
CREATE INDEX "workflow_steps_tenantId_workflowId_idx" ON "workflow_steps"("tenantId", "workflowId");
CREATE INDEX "workflow_steps_tenantId_type_idx" ON "workflow_steps"("tenantId", "type");

CREATE UNIQUE INDEX "workflow_transitions_workflowId_source_target_route_key"
  ON "workflow_transitions"("workflowId", "sourceStepId", "targetStepId", "route");
CREATE INDEX "workflow_transitions_tenantId_idx" ON "workflow_transitions"("tenantId");
CREATE INDEX "workflow_transitions_tenantId_id_idx" ON "workflow_transitions"("tenantId", "id");
CREATE INDEX "workflow_transitions_tenantId_workflowId_idx" ON "workflow_transitions"("tenantId", "workflowId");
CREATE INDEX "workflow_transitions_tenantId_sourceStepId_idx" ON "workflow_transitions"("tenantId", "sourceStepId");
CREATE INDEX "workflow_transitions_tenantId_targetStepId_idx" ON "workflow_transitions"("tenantId", "targetStepId");

CREATE INDEX "workflow_executions_tenantId_idx" ON "workflow_executions"("tenantId");
CREATE INDEX "workflow_executions_tenantId_id_idx" ON "workflow_executions"("tenantId", "id");
CREATE INDEX "workflow_executions_tenantId_workflowId_idx" ON "workflow_executions"("tenantId", "workflowId");
CREATE INDEX "workflow_executions_tenantId_status_idx" ON "workflow_executions"("tenantId", "status");
CREATE INDEX "workflow_executions_tenantId_startedAt_idx" ON "workflow_executions"("tenantId", "startedAt");
CREATE INDEX "workflow_executions_tenantId_dedupeHash_idx" ON "workflow_executions"("tenantId", "dedupeHash");

CREATE UNIQUE INDEX "step_results_executionId_stepId_attempt_key"
  ON "step_results"("executionId", "stepId", "attempt");
CREATE INDEX "step_results_tenantId_idx" ON "step_results"("tenantId");
CREATE INDEX "step_results_tenantId_id_idx" ON "step_results"("tenantId", "id");
CREATE INDEX "step_results_tenantId_executionId_idx" ON "step_results"("tenantId", "executionId");
CREATE INDEX "step_results_tenantId_workflowId_idx" ON "step_results"("tenantId", "workflowId");
CREATE INDEX "step_results_tenantId_stepId_idx" ON "step_results"("tenantId", "stepId");
CREATE INDEX "step_results_tenantId_status_idx" ON "step_results"("tenantId", "status");

ALTER TABLE "workflow_steps"
  ADD CONSTRAINT "workflow_steps_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_steps"
  ADD CONSTRAINT "workflow_steps_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_transitions"
  ADD CONSTRAINT "workflow_transitions_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_transitions"
  ADD CONSTRAINT "workflow_transitions_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_transitions"
  ADD CONSTRAINT "workflow_transitions_sourceStepId_fkey"
  FOREIGN KEY ("sourceStepId") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_transitions"
  ADD CONSTRAINT "workflow_transitions_targetStepId_fkey"
  FOREIGN KEY ("targetStepId") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_executions"
  ADD CONSTRAINT "workflow_executions_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_executions"
  ADD CONSTRAINT "workflow_executions_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "step_results"
  ADD CONSTRAINT "step_results_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "step_results"
  ADD CONSTRAINT "step_results_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "step_results"
  ADD CONSTRAINT "step_results_executionId_fkey"
  FOREIGN KEY ("executionId") REFERENCES "workflow_executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "step_results"
  ADD CONSTRAINT "step_results_stepId_fkey"
  FOREIGN KEY ("stepId") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "workflow_steps" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_steps" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy_workflow_steps ON "workflow_steps"
  FOR ALL
  USING ("tenantId" = get_current_tenant_id())
  WITH CHECK ("tenantId" = get_current_tenant_id());

ALTER TABLE "workflow_transitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_transitions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy_workflow_transitions ON "workflow_transitions"
  FOR ALL
  USING ("tenantId" = get_current_tenant_id())
  WITH CHECK ("tenantId" = get_current_tenant_id());

ALTER TABLE "workflow_executions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "workflow_executions" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy_workflow_executions ON "workflow_executions"
  FOR ALL
  USING ("tenantId" = get_current_tenant_id())
  WITH CHECK ("tenantId" = get_current_tenant_id());

ALTER TABLE "step_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "step_results" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation_policy_step_results ON "step_results"
  FOR ALL
  USING ("tenantId" = get_current_tenant_id())
  WITH CHECK ("tenantId" = get_current_tenant_id());
