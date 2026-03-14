-- Billing and usage metering
CREATE TYPE "SubscriptionPlan" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'UNPAID');
CREATE TYPE "UsageFeature" AS ENUM ('AGENT_CALL', 'API_REQUEST', 'STORAGE_GB', 'WORKFLOW_RUN');

CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "status" "SubscriptionStatus" NOT NULL,
    "stripeCustomerId" TEXT,
    "stripeSubscriptionId" TEXT,
    "billingPeriodStart" TIMESTAMP(3) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "feature" "UsageFeature" NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'count',
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Subscription_tenantId_status_idx" ON "Subscription"("tenantId", "status");
CREATE INDEX "Subscription_stripeSubscriptionId_idx" ON "Subscription"("stripeSubscriptionId");
CREATE INDEX "UsageRecord_tenantId_feature_periodStart_periodEnd_idx" ON "UsageRecord"("tenantId", "feature", "periodStart", "periodEnd");

ALTER TABLE "Subscription"
    ADD CONSTRAINT "Subscription_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "UsageRecord"
    ADD CONSTRAINT "UsageRecord_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
