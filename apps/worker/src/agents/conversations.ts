import { Prisma, prisma } from "@birthub/database";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function buildContentPreview(content: unknown): string {
  if (typeof content === "string") {
    return content.slice(0, 500);
  }

  return JSON.stringify(content ?? null).slice(0, 500);
}

async function resolveExistingThread(input: {
  correlationId?: string | null;
  externalThreadId?: string | null;
  organizationId: string;
  threadId?: string | null;
}) {
  const threadId = input.threadId?.trim();
  if (threadId) {
    return prisma.conversationThread.findFirst({
      where: {
        id: threadId,
        organizationId: input.organizationId
      }
    });
  }

  const externalThreadId = input.externalThreadId?.trim();
  if (externalThreadId) {
    return prisma.conversationThread.findFirst({
      where: {
        externalThreadId,
        organizationId: input.organizationId
      }
    });
  }

  const correlationId = input.correlationId?.trim();
  if (correlationId) {
    return prisma.conversationThread.findFirst({
      orderBy: {
        createdAt: "desc"
      },
      where: {
        correlationId,
        organizationId: input.organizationId
      }
    });
  }

  return null;
}

export async function ensureConversationThread(input: {
  channel: string;
  connectorAccountId?: string | null;
  correlationId?: string | null;
  customerReference?: string | null;
  externalThreadId?: string | null;
  leadReference?: string | null;
  metadata?: Record<string, unknown>;
  organizationId: string;
  status?: string;
  subject?: string | null;
  tenantId: string;
  threadId?: string | null;
}) {
  const existing = await resolveExistingThread(input);

  if (existing) {
    return prisma.conversationThread.update({
      data: {
        ...(input.connectorAccountId && !existing.connectorAccountId
          ? { connectorAccountId: input.connectorAccountId }
          : {}),
        ...(input.correlationId && !existing.correlationId
          ? { correlationId: input.correlationId }
          : {}),
        ...(input.externalThreadId && !existing.externalThreadId
          ? { externalThreadId: input.externalThreadId }
          : {}),
        ...(input.metadata ? { metadata: toJsonValue(input.metadata) } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.subject && !existing.subject ? { subject: input.subject } : {})
      },
      where: {
        id: existing.id
      }
    });
  }

  return prisma.conversationThread.create({
    data: {
      channel: input.channel,
      ...(input.connectorAccountId ? { connectorAccountId: input.connectorAccountId } : {}),
      ...(input.correlationId ? { correlationId: input.correlationId } : {}),
      ...(input.customerReference ? { customerReference: input.customerReference } : {}),
      ...(input.externalThreadId ? { externalThreadId: input.externalThreadId } : {}),
      ...(input.leadReference ? { leadReference: input.leadReference } : {}),
      ...(input.metadata ? { metadata: toJsonValue(input.metadata) } : {}),
      organizationId: input.organizationId,
      status: input.status ?? "open",
      ...(input.subject ? { subject: input.subject } : {}),
      tenantId: input.tenantId
    }
  });
}

export async function createConversationMessage(input: {
  agentId?: string | null;
  content: unknown;
  direction: string;
  externalMessageId?: string | null;
  metadata?: Record<string, unknown>;
  organizationId: string;
  role?: string | null;
  tenantId: string;
  threadId: string;
}) {
  return prisma.conversationMessage.create({
    data: {
      ...(input.agentId ? { agentId: input.agentId } : {}),
      content: toJsonValue(input.content),
      contentPreview: buildContentPreview(input.content),
      direction: input.direction,
      ...(input.externalMessageId ? { externalMessageId: input.externalMessageId } : {}),
      ...(input.metadata ? { metadata: toJsonValue(input.metadata) } : {}),
      organizationId: input.organizationId,
      ...(input.role ? { role: input.role } : {}),
      tenantId: input.tenantId,
      threadId: input.threadId
    }
  });
}
