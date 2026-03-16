import { Prisma, prisma } from "@birthub/database";

import {
  createConversationMessage,
  ensureConversationThread
} from "./conversations.js";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function resolveOrganizationId(tenantId: string): Promise<string> {
  const organization = await prisma.organization.findFirst({
    where: {
      tenantId
    }
  });

  if (!organization) {
    throw new Error(`HANDOFF_ORGANIZATION_NOT_FOUND:${tenantId}`);
  }

  return organization.id;
}

export async function persistAgentHandoff(input: {
  context: Record<string, unknown>;
  contextSummary: string;
  correlationId: string;
  executionId: string;
  sourceAgentId: string;
  summary: string;
  targetAgentId: string;
  tenantId: string;
  threadId?: string;
  workflowId: string;
}) {
  const organizationId = await resolveOrganizationId(input.tenantId);
  const thread = await ensureConversationThread({
    channel: "agent-handoff",
    correlationId: input.correlationId,
    metadata: {
      sourceAgentId: input.sourceAgentId,
      targetAgentId: input.targetAgentId,
      workflowId: input.workflowId
    },
    organizationId,
    tenantId: input.tenantId,
    ...(input.threadId ? { threadId: input.threadId } : {})
  });

  const handoff = await prisma.agentHandoff.create({
    data: {
      context: toJsonValue({
        ...input.context,
        contextSummary: input.contextSummary,
        workflowId: input.workflowId
      }),
      correlationId: input.correlationId,
      organizationId,
      sourceAgentId: input.sourceAgentId,
      sourceExecutionId: input.executionId,
      status: "queued",
      summary: input.summary,
      targetAgentId: input.targetAgentId,
      tenantId: input.tenantId,
      threadId: thread.id
    }
  });

  await createConversationMessage({
    agentId: input.sourceAgentId,
    content: {
      correlationId: input.correlationId,
      sourceAgentId: input.sourceAgentId,
      summary: input.summary,
      targetAgentId: input.targetAgentId,
      type: "agent_handoff",
      workflowId: input.workflowId
    },
    direction: "internal",
    metadata: {
      executionId: input.executionId,
      handoffId: handoff.id
    },
    organizationId,
    role: "system",
    tenantId: input.tenantId,
    threadId: thread.id
  });

  return {
    correlationId: handoff.correlationId,
    handoffId: handoff.id,
    status: handoff.status,
    threadId: thread.id
  };
}
