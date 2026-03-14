-- CreateIndex
CREATE INDEX "Lead_organizationId_status_idx" ON "Lead"("organizationId", "status");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_icpScore_idx" ON "Lead"("icpScore");

-- CreateIndex
CREATE INDEX "Deal_organizationId_stage_idx" ON "Deal"("organizationId", "stage");

-- CreateIndex
CREATE INDEX "Deal_assignedAEId_stage_idx" ON "Deal"("assignedAEId", "stage");

-- CreateIndex
CREATE INDEX "Invoice_customerId_status_idx" ON "Invoice"("customerId", "status");

-- CreateIndex
CREATE INDEX "Invoice_dueDate_status_idx" ON "Invoice"("dueDate", "status");

-- CreateIndex
CREATE INDEX "Activity_leadId_createdAt_idx" ON "Activity"("leadId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_dealId_createdAt_idx" ON "Activity"("dealId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentLog_agentName_createdAt_idx" ON "AgentLog"("agentName", "createdAt");

-- CreateIndex
CREATE INDEX "AgentLog_jobId_idx" ON "AgentLog"("jobId");
