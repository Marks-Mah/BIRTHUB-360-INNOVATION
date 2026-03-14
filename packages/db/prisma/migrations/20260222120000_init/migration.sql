-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('STARTER', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'CMO', 'HEAD_MARKETING', 'SDR', 'AE', 'CS_MANAGER', 'FINANCIAL', 'LEGAL', 'ANALYST', 'VIEWER');

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'ENRICHING', 'QUALIFIED', 'DISQUALIFIED', 'CONTACTED', 'MEETING_SCHEDULED', 'IN_NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST', 'NURTURING');

-- CreateEnum
CREATE TYPE "DealStage" AS ENUM ('PROSPECTING', 'QUALIFICATION', 'DEMO_SCHEDULED', 'DEMO_DONE', 'PROPOSAL_SENT', 'NEGOTIATION', 'CONTRACT_REVIEW', 'CLOSED_WON', 'CLOSED_LOST');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'REVIEW', 'PENDING_SIGNATURE', 'PARTIALLY_SIGNED', 'SIGNED', 'ACTIVE', 'EXPIRED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PENDING', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'IN_DUNNING', 'CANCELLED', 'WRITTEN_OFF');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('EMAIL_SENT', 'EMAIL_OPENED', 'EMAIL_REPLIED', 'CALL_MADE', 'CALL_ANSWERED', 'WHATSAPP_SENT', 'WHATSAPP_REPLIED', 'LINKEDIN_INMAIL', 'MEETING_SCHEDULED', 'MEETING_COMPLETED', 'PROPOSAL_SENT', 'CONTRACT_SENT', 'CONTRACT_SIGNED', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'NPS_COLLECTED', 'HEALTH_ALERT', 'UPSELL_TRIGGERED', 'AGENT_ACTION');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnpj" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'STARTER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "linkedin" TEXT,
    "company" TEXT NOT NULL,
    "jobTitle" TEXT,
    "icpScore" INTEGER NOT NULL DEFAULT 0,
    "icpTier" TEXT,
    "intentScore" INTEGER NOT NULL DEFAULT 0,
    "techStack" JSONB,
    "orgChart" JSONB,
    "financialData" JSONB,
    "intentSignals" JSONB,
    "emailValid" BOOLEAN NOT NULL DEFAULT false,
    "emailStatus" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
    "source" TEXT,
    "utmData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "assignedAEId" TEXT,
    "assignedSDRId" TEXT,
    "title" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "stage" "DealStage" NOT NULL DEFAULT 'PROSPECTING',
    "probability" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "forecastCategory" TEXT,
    "expectedCloseDate" TIMESTAMP(3),
    "actualCloseDate" TIMESTAMP(3),
    "products" JSONB,
    "discountPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalValue" DOUBLE PRECISION,
    "competitors" JSONB,
    "stakeholders" JSONB,
    "objections" JSONB,
    "callNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT,
    "dealId" TEXT,
    "agentId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "channel" TEXT,
    "content" JSONB NOT NULL,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailCadence" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "step" INTEGER NOT NULL,
    "channel" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "repliedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailCadence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "healthScore" INTEGER NOT NULL DEFAULT 100,
    "healthStatus" TEXT NOT NULL DEFAULT 'healthy',
    "lastLoginAt" TIMESTAMP(3),
    "loginFrequency" DOUBLE PRECISION,
    "featureAdoption" JSONB,
    "supportSentiment" TEXT,
    "mrr" DOUBLE PRECISION NOT NULL,
    "planId" TEXT NOT NULL,
    "contractStart" TIMESTAMP(3) NOT NULL,
    "contractEnd" TIMESTAMP(3) NOT NULL,
    "npsScore" INTEGER,
    "npsCategory" TEXT,
    "npsComment" TEXT,
    "churnRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "churnReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "customerId" TEXT,
    "type" TEXT NOT NULL,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "content" TEXT,
    "fileUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "riskScore" INTEGER,
    "redFlags" JSONB,
    "summary" TEXT,
    "docusignId" TEXT,
    "clicksignId" TEXT,
    "signatories" JSONB,
    "signedAt" TIMESTAMP(3),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "renewalDate" TIMESTAMP(3),
    "kycStatus" TEXT,
    "kycData" JSONB,
    "amlStatus" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "dunningStep" INTEGER NOT NULL DEFAULT 0,
    "dunningLastAt" TIMESTAMP(3),
    "nfeKey" TEXT,
    "nfeStatus" TEXT,
    "nfeUrl" TEXT,
    "gateway" TEXT,
    "gatewayId" TEXT,
    "paymentMethod" TEXT,
    "reconciledAt" TIMESTAMP(3),
    "bankReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupportTicket" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "category" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "sentiment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "baseAmount" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "finalAmount" DOUBLE PRECISION NOT NULL,
    "type" TEXT NOT NULL,
    "clawbackAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Commission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentLog" (
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
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_cnpj_key" ON "Organization"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_leadId_key" ON "Customer"("leadId");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_dealId_key" ON "Customer"("dealId");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_dealId_key" ON "Contract"("dealId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_assignedAEId_fkey" FOREIGN KEY ("assignedAEId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_assignedSDRId_fkey" FOREIGN KEY ("assignedSDRId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
