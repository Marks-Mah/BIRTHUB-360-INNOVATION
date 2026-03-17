CREATE TYPE "InvoiceStatus" AS ENUM ('draft', 'open', 'paid', 'uncollectible', 'void', 'past_due');

CREATE TABLE "plans" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "stripe_product_id" TEXT,
  "stripe_price_id" TEXT,
  "limits" JSONB NOT NULL,
  "monthly_price_cents" INTEGER NOT NULL DEFAULT 0,
  "yearly_price_cents" INTEGER,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");
CREATE UNIQUE INDEX "plans_stripe_product_id_key" ON "plans"("stripe_product_id");
CREATE UNIQUE INDEX "plans_stripe_price_id_key" ON "plans"("stripe_price_id");
CREATE INDEX "plans_active_idx" ON "plans"("active");

INSERT INTO "plans" (
  "id",
  "code",
  "name",
  "description",
  "stripe_product_id",
  "stripe_price_id",
  "limits",
  "monthly_price_cents",
  "yearly_price_cents",
  "currency",
  "active",
  "createdAt",
  "updatedAt"
)
VALUES
  (
    'plan_starter',
    'starter',
    'Starter',
    'Plano de entrada para times pequenos.',
    'prod_starter',
    'price_starter_monthly',
    '{"agents":5,"workflows":30,"monthlyTokens":250000,"features":{"agents":true,"workflows":true,"advancedAnalytics":false,"customerPortal":true}}'::jsonb,
    4900,
    47040,
    'usd',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'plan_professional',
    'professional',
    'Professional',
    'Plano para operação em escala com automações avançadas.',
    'prod_professional',
    'price_professional_monthly',
    '{"agents":25,"workflows":250,"monthlyTokens":2500000,"features":{"agents":true,"workflows":true,"advancedAnalytics":true,"customerPortal":true}}'::jsonb,
    14900,
    143040,
    'usd',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'plan_enterprise',
    'enterprise',
    'Enterprise',
    'Plano enterprise com limites ilimitados e suporte prioritário.',
    'prod_enterprise',
    'price_enterprise_monthly',
    '{"agents":-1,"workflows":-1,"monthlyTokens":-1,"features":{"agents":true,"workflows":true,"advancedAnalytics":true,"customerPortal":true,"prioritySupport":true}}'::jsonb,
    49900,
    479040,
    'usd',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );

ALTER TABLE "organizations"
  ADD COLUMN "stripe_customer_id" TEXT,
  ADD COLUMN "plan_id" TEXT;

ALTER TABLE "subscriptions"
  RENAME COLUMN "renewsAt" TO "current_period_end";

ALTER TABLE "subscriptions"
  ADD COLUMN "planId" TEXT,
  ADD COLUMN "stripe_subscription_id" TEXT,
  ADD COLUMN "stripe_customer_id" TEXT,
  ADD COLUMN "canceled_at" TIMESTAMP(3),
  ADD COLUMN "grace_period_ends_at" TIMESTAMP(3);

UPDATE "subscriptions" s
SET "planId" = p."id"
FROM "plans" p
WHERE p."code" = CASE s."plan"
  WHEN 'STARTER' THEN 'starter'
  WHEN 'PRO' THEN 'professional'
  WHEN 'ENTERPRISE' THEN 'enterprise'
END;

UPDATE "organizations" o
SET "plan_id" = s."planId"
FROM "subscriptions" s
WHERE s."organizationId" = o."id";

UPDATE "subscriptions" s
SET "stripe_customer_id" = o."stripe_customer_id"
FROM "organizations" o
WHERE o."id" = s."organizationId";

ALTER TABLE "subscriptions"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;

UPDATE "subscriptions"
SET "status" = CASE
  WHEN "status" = 'TRIALING' THEN 'trial'
  WHEN "status" = 'ACTIVE' THEN 'active'
  WHEN "status" = 'PAST_DUE' THEN 'past_due'
  WHEN "status" = 'CANCELLED' THEN 'canceled'
  ELSE lower("status")
END;

DROP TYPE "SubscriptionStatus";
CREATE TYPE "SubscriptionStatus" AS ENUM ('trial', 'active', 'past_due', 'canceled', 'paused');

ALTER TABLE "subscriptions"
  ALTER COLUMN "status" TYPE "SubscriptionStatus" USING "status"::"SubscriptionStatus",
  ALTER COLUMN "status" SET DEFAULT 'trial';

ALTER TABLE "subscriptions"
  DROP COLUMN "plan";

DROP TYPE "SubscriptionPlan";

ALTER TABLE "subscriptions"
  ALTER COLUMN "planId" SET NOT NULL;

ALTER TABLE "organizations"
  ADD CONSTRAINT "organizations_plan_id_fkey"
  FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "organizations_stripe_customer_id_key" ON "organizations"("stripe_customer_id");
CREATE INDEX "organizations_stripe_customer_id_idx" ON "organizations"("stripe_customer_id");
CREATE INDEX "organizations_plan_id_idx" ON "organizations"("plan_id");

CREATE UNIQUE INDEX "subscriptions_stripe_subscription_id_key" ON "subscriptions"("stripe_subscription_id");
CREATE INDEX "subscriptions_stripe_customer_id_idx" ON "subscriptions"("stripe_customer_id");

CREATE TABLE "invoices" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "stripe_invoice_id" TEXT NOT NULL,
  "status" "InvoiceStatus" NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'usd',
  "amount_due_cents" INTEGER NOT NULL DEFAULT 0,
  "amount_paid_cents" INTEGER NOT NULL DEFAULT 0,
  "hosted_invoice_url" TEXT,
  "invoice_pdf_url" TEXT,
  "due_date" TIMESTAMP(3),
  "period_start" TIMESTAMP(3),
  "period_end" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_stripe_invoice_id_key" ON "invoices"("stripe_invoice_id");
CREATE INDEX "invoices_tenantId_idx" ON "invoices"("tenantId");
CREATE INDEX "invoices_tenantId_status_idx" ON "invoices"("tenantId", "status");
CREATE INDEX "invoices_organizationId_createdAt_idx" ON "invoices"("organizationId", "createdAt");

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "invoices"
  ADD CONSTRAINT "invoices_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "payment_methods" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "stripe_payment_method_id" TEXT NOT NULL,
  "brand" TEXT,
  "last4" TEXT,
  "exp_month" INTEGER,
  "exp_year" INTEGER,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payment_methods_stripe_payment_method_id_key" ON "payment_methods"("stripe_payment_method_id");
CREATE INDEX "payment_methods_tenantId_idx" ON "payment_methods"("tenantId");
CREATE INDEX "payment_methods_organizationId_is_default_idx" ON "payment_methods"("organizationId", "is_default");

ALTER TABLE "payment_methods"
  ADD CONSTRAINT "payment_methods_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "usage_records" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "subscriptionId" TEXT,
  "event_id" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unit" TEXT NOT NULL DEFAULT 'tokens',
  "metadata" JSONB,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "usage_records_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "usage_records_event_id_key" ON "usage_records"("event_id");
CREATE INDEX "usage_records_tenantId_idx" ON "usage_records"("tenantId");
CREATE INDEX "usage_records_tenantId_metric_idx" ON "usage_records"("tenantId", "metric");
CREATE INDEX "usage_records_organizationId_occurred_at_idx" ON "usage_records"("organizationId", "occurred_at");

ALTER TABLE "usage_records"
  ADD CONSTRAINT "usage_records_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "usage_records"
  ADD CONSTRAINT "usage_records_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "billing_events" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT,
  "organizationId" TEXT,
  "stripe_event_id" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "billing_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "billing_events_stripe_event_id_key" ON "billing_events"("stripe_event_id");
CREATE INDEX "billing_events_tenantId_idx" ON "billing_events"("tenantId");
CREATE INDEX "billing_events_organizationId_processed_at_idx" ON "billing_events"("organizationId", "processed_at");

ALTER TABLE "billing_events"
  ADD CONSTRAINT "billing_events_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;
