CREATE TYPE "BillingCreditReason" AS ENUM ('DOWNGRADE_PRORATION');

CREATE TABLE "billing_credits" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "stripe_event_id" TEXT NOT NULL,
  "stripe_invoice_id" TEXT,
  "amount_cents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "reason" "BillingCreditReason" NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "billing_credits_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_credits_stripe_event_id_key" ON "billing_credits"("stripe_event_id");
CREATE INDEX "billing_credits_tenantId_idx" ON "billing_credits"("tenantId");
CREATE INDEX "billing_credits_organizationId_createdAt_idx" ON "billing_credits"("organizationId", "createdAt");
CREATE INDEX "billing_credits_subscriptionId_idx" ON "billing_credits"("subscriptionId");
CREATE INDEX "billing_credits_tenantId_reason_idx" ON "billing_credits"("tenantId", "reason");

ALTER TABLE "billing_credits"
  ADD CONSTRAINT "billing_credits_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "billing_credits"
  ADD CONSTRAINT "billing_credits_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
