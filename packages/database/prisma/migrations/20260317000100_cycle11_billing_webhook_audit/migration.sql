CREATE TYPE "BillingEventStatus" AS ENUM ('received', 'processing', 'processed', 'failed');

ALTER TABLE "billing_events"
  ADD COLUMN "status" "BillingEventStatus",
  ADD COLUMN "attempt_count" INTEGER,
  ADD COLUMN "signature_timestamp" TIMESTAMP(3),
  ADD COLUMN "event_created_at" TIMESTAMP(3),
  ADD COLUMN "failed_at" TIMESTAMP(3),
  ADD COLUMN "last_error" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3);

ALTER TABLE "billing_events"
  ALTER COLUMN "processed_at" DROP NOT NULL,
  ALTER COLUMN "processed_at" DROP DEFAULT;

UPDATE "billing_events"
SET
  "status" = 'processed',
  "attempt_count" = 1,
  "updatedAt" = COALESCE("processed_at", "createdAt");

ALTER TABLE "billing_events"
  ALTER COLUMN "status" SET NOT NULL,
  ALTER COLUMN "status" SET DEFAULT 'received',
  ALTER COLUMN "attempt_count" SET NOT NULL,
  ALTER COLUMN "attempt_count" SET DEFAULT 0,
  ALTER COLUMN "updatedAt" SET NOT NULL;

CREATE INDEX "billing_events_status_createdAt_idx" ON "billing_events"("status", "createdAt");
