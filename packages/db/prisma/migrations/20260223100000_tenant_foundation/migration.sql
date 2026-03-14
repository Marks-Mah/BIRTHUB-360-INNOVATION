-- Tenant isolation foundation
CREATE TYPE "TenantStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "billingEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Organization" ADD COLUMN "tenantId" TEXT;

CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");
CREATE INDEX "Organization_tenantId_idx" ON "Organization"("tenantId");

ALTER TABLE "Organization"
    ADD CONSTRAINT "Organization_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
