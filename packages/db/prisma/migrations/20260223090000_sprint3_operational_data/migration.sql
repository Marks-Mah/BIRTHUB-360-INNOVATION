-- Soft delete columns for critical entities
ALTER TABLE "Lead" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Deal" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Customer" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Contract" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "Invoice" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Additional constraints to enforce business integrity
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_probability_check" CHECK ("probability" >= 0 AND "probability" <= 100);
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_healthScore_check" CHECK ("healthScore" >= 0 AND "healthScore" <= 100);
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_churnRisk_check" CHECK ("churnRisk" >= 0 AND "churnRisk" <= 1);
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_amount_check" CHECK ("amount" >= 0);

-- Partial indexes for active records / hot paths
CREATE INDEX "Lead_active_org_status_idx" ON "Lead" ("organizationId", "status", "createdAt") WHERE "deletedAt" IS NULL;
CREATE INDEX "Deal_active_org_stage_idx" ON "Deal" ("organizationId", "stage", "expectedCloseDate") WHERE "deletedAt" IS NULL;
CREATE INDEX "Invoice_active_customer_dueDate_idx" ON "Invoice" ("customerId", "dueDate") WHERE "deletedAt" IS NULL;
CREATE INDEX "Contract_active_renewalDate_idx" ON "Contract" ("renewalDate") WHERE "deletedAt" IS NULL;
CREATE INDEX "AgentLog_createdAt_idx" ON "AgentLog" ("createdAt");

-- Archive table used by retention job
CREATE TABLE "AgentLogArchive" (
  "id" TEXT NOT NULL,
  "agentName" TEXT NOT NULL,
  "jobId" TEXT,
  "action" TEXT NOT NULL,
  "input" JSONB,
  "output" JSONB,
  "tokensIn" INTEGER,
  "tokensOut" INTEGER,
  "durationMs" INTEGER,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentLogArchive_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentLogArchive_createdAt_idx" ON "AgentLogArchive" ("createdAt");
CREATE INDEX "AgentLogArchive_archivedAt_idx" ON "AgentLogArchive" ("archivedAt");

-- Helper function for retention / archival execution by scheduler
CREATE OR REPLACE FUNCTION archive_agent_logs(retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  archived_rows INTEGER;
BEGIN
  WITH moved_rows AS (
    INSERT INTO "AgentLogArchive" (
      "id", "agentName", "jobId", "action", "input", "output", "tokensIn", "tokensOut", "durationMs", "error", "createdAt"
    )
    SELECT
      "id", "agentName", "jobId", "action", "input", "output", "tokensIn", "tokensOut", "durationMs", "error", "createdAt"
    FROM "AgentLog"
    WHERE "createdAt" < NOW() - make_interval(days => retention_days)
    ON CONFLICT ("id") DO NOTHING
    RETURNING "id"
  )
  SELECT COUNT(*) INTO archived_rows FROM moved_rows;

  DELETE FROM "AgentLog"
  WHERE "createdAt" < NOW() - make_interval(days => retention_days);

  RETURN archived_rows;
END;
$$ LANGUAGE plpgsql;
