-- Enterprise SaaS models
CREATE TABLE IF NOT EXISTS "Subscription" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "plan" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "currentPeriodStart" TIMESTAMP(3) NOT NULL,
  "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
  "stripeSubId" TEXT UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Subscription_organizationId_status_idx" ON "Subscription"("organizationId","status");

CREATE TABLE IF NOT EXISTS "UsageRecord" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "subscriptionId" TEXT NOT NULL,
  "metric" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UsageRecord_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "UsageRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "UsageRecord_org_metric_recordedAt_idx" ON "UsageRecord"("organizationId","metric","recordedAt");

CREATE TABLE IF NOT EXISTS "RefreshToken" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "RefreshToken_userId_expiresAt_idx" ON "RefreshToken"("userId","expiresAt");

CREATE TABLE IF NOT EXISTS "Role" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS "Permission" (
  "id" TEXT PRIMARY KEY,
  "action" TEXT NOT NULL,
  "resource" TEXT NOT NULL,
  CONSTRAINT "Permission_action_resource_key" UNIQUE ("action","resource")
);

CREATE TABLE IF NOT EXISTS "Workflow" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "definition" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Workflow_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Workflow_org_status_idx" ON "Workflow"("organizationId","status");

CREATE TABLE IF NOT EXISTS "AgentTask" (
  "id" TEXT PRIMARY KEY,
  "workflowId" TEXT,
  "agentType" TEXT NOT NULL,
  "task" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "result" JSONB,
  "error" TEXT,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentTask_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AgentTask_agentType_status_createdAt_idx" ON "AgentTask"("agentType","status","createdAt");

CREATE TABLE IF NOT EXISTS "Conversation" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "Conversation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CallSession" (
  "id" TEXT PRIMARY KEY,
  "conversationId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "callId" TEXT NOT NULL UNIQUE,
  "status" TEXT NOT NULL,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  CONSTRAINT "CallSession_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CallTranscript" (
  "id" TEXT PRIMARY KEY,
  "callSessionId" TEXT NOT NULL,
  "speaker" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION,
  "startMs" INTEGER NOT NULL,
  "endMs" INTEGER NOT NULL,
  CONSTRAINT "CallTranscript_callSessionId_fkey" FOREIGN KEY ("callSessionId") REFERENCES "CallSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "_RoleToUser" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_RoleToUser_AB_unique" UNIQUE ("A", "B"),
  CONSTRAINT "_RoleToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "_RoleToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "_PermissionToRole" (
  "A" TEXT NOT NULL,
  "B" TEXT NOT NULL,
  CONSTRAINT "_PermissionToRole_AB_unique" UNIQUE ("A", "B"),
  CONSTRAINT "_PermissionToRole_A_fkey" FOREIGN KEY ("A") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "_PermissionToRole_B_fkey" FOREIGN KEY ("B") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
