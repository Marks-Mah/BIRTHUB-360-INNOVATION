import { Prisma, prisma } from "@birthub/database";
import type { ConnectorActionRequest } from "@birthub/workflows-core";

import {
  createConversationMessage,
  ensureConversationThread
} from "../agents/conversations.js";
import { syncOrganizationToHubspot } from "./hubspot.js";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function resolveOrganization(input: { tenantId: string }) {
  const organization = await prisma.organization.findFirst({
    where: {
      tenantId: input.tenantId
    }
  });

  if (!organization) {
    throw new Error(`CONNECTOR_ORGANIZATION_NOT_FOUND:${input.tenantId}`);
  }

  return organization;
}

async function resolveConnectorAccount(input: {
  connectorAccountId?: string;
  organizationId: string;
  provider: string;
}) {
  if (input.connectorAccountId) {
    return prisma.connectorAccount.findFirst({
      where: {
        id: input.connectorAccountId,
        organizationId: input.organizationId
      }
    });
  }

  return prisma.connectorAccount.findFirst({
    orderBy: {
      createdAt: "asc"
    },
    where: {
      organizationId: input.organizationId,
      provider: input.provider,
      status: {
        in: ["active", "pending", "pending_token_exchange"]
      }
    }
  });
}

async function touchConnectorState(input: {
  connectorAccountId?: string | null;
  metadata?: Record<string, unknown>;
  organizationId: string;
  scope: string;
  status: string;
  tenantId: string;
}) {
  if (!input.connectorAccountId) {
    return;
  }

  await prisma.connectorAccount.update({
    data: {
      lastSyncAt: new Date(),
      ...(input.status === "failed" ? { status: "attention" } : {})
    },
    where: {
      id: input.connectorAccountId
    }
  });

  await prisma.connectorSyncCursor.upsert({
    create: {
      connectorAccountId: input.connectorAccountId,
      cursor: toJsonValue({}),
      ...(input.metadata ? { metadata: toJsonValue(input.metadata) } : {}),
      lastSyncAt: new Date(),
      organizationId: input.organizationId,
      scope: input.scope,
      status: input.status,
      tenantId: input.tenantId
    },
    update: {
      ...(input.metadata ? { metadata: toJsonValue(input.metadata) } : {}),
      lastSyncAt: new Date(),
      status: input.status
    },
    where: {
      connectorAccountId_scope: {
        connectorAccountId: input.connectorAccountId,
        scope: input.scope
      }
    }
  });
}

async function executeCrmUpsert(input: {
  action: Extract<ConnectorActionRequest, { kind: "CRM_UPSERT" }>;
  executionId: string;
  organizationId: string;
  tenantId: string;
  workflowId: string;
}) {
  const provider = input.action.provider ?? "hubspot";
  const connectorAccount = await resolveConnectorAccount({
    ...(input.action.connectorAccountId
      ? { connectorAccountId: input.action.connectorAccountId }
      : {}),
    organizationId: input.organizationId,
    provider
  });

  if (provider === "hubspot" && input.action.objectType === "company") {
    const response = await syncOrganizationToHubspot({
      organizationId: input.organizationId,
      tenantId: input.tenantId
    });

    await touchConnectorState({
      connectorAccountId: connectorAccount?.id ?? null,
      metadata: {
        executionId: input.executionId,
        objectType: input.action.objectType,
        provider,
        responseStatus: response.status,
        workflowId: input.workflowId
      },
      organizationId: input.organizationId,
      scope: input.action.scope ?? "crm:companies",
      status: "success",
      tenantId: input.tenantId
    });

    return {
      objectType: input.action.objectType,
      provider,
      responseStatus: response.status,
      synced: true
    };
  }

  await prisma.crmSyncEvent.create({
    data: {
      direction: "workflow",
      eventType: `${provider}.${input.action.objectType}.${input.action.operation ?? "upsert"}`,
      organizationId: input.organizationId,
      provider,
      requestBody: toJsonValue({
        executionId: input.executionId,
        payload: input.action.payload,
        workflowId: input.workflowId
      }),
      responseBody: JSON.stringify({
        queued: true
      }),
      responseStatus: 202,
      tenantId: input.tenantId
    }
  });

  await touchConnectorState({
    connectorAccountId: connectorAccount?.id ?? null,
    metadata: {
      executionId: input.executionId,
      objectType: input.action.objectType,
      provider,
      workflowId: input.workflowId
    },
    organizationId: input.organizationId,
    scope: input.action.scope ?? `crm:${input.action.objectType}`,
    status: "queued",
    tenantId: input.tenantId
  });

  return {
    objectType: input.action.objectType,
    provider,
    queued: true
  };
}

async function executeWhatsappSend(input: {
  action: Extract<ConnectorActionRequest, { kind: "WHATSAPP_SEND" }>;
  executionId: string;
  organizationId: string;
  tenantId: string;
  workflowId: string;
}) {
  const provider = "twilio-whatsapp";
  const connectorAccount = await resolveConnectorAccount({
    ...(input.action.connectorAccountId
      ? { connectorAccountId: input.action.connectorAccountId }
      : {}),
    organizationId: input.organizationId,
    provider
  });
  const thread = await ensureConversationThread({
    channel: "whatsapp",
    ...(connectorAccount?.id ? { connectorAccountId: connectorAccount.id } : {}),
    correlationId: input.executionId,
    ...(input.action.threadId ? { externalThreadId: input.action.threadId } : {}),
    metadata: {
      provider,
      to: input.action.to,
      workflowId: input.workflowId
    },
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    ...(input.action.threadId ? { threadId: input.action.threadId } : {})
  });
  const message = await createConversationMessage({
    content: {
      message: input.action.message,
      template: input.action.template ?? null,
      to: input.action.to,
      type: "whatsapp_outbound"
    },
    direction: "outbound",
    metadata: {
      executionId: input.executionId,
      workflowId: input.workflowId
    },
    organizationId: input.organizationId,
    role: "assistant",
    tenantId: input.tenantId,
    threadId: thread.id
  });

  await touchConnectorState({
    connectorAccountId: connectorAccount?.id ?? null,
    metadata: {
      executionId: input.executionId,
      messageId: message.id,
      threadId: thread.id,
      workflowId: input.workflowId
    },
    organizationId: input.organizationId,
    scope: "whatsapp:messages",
    status: "queued",
    tenantId: input.tenantId
  });

  return {
    messageId: message.id,
    provider,
    queued: true,
    threadId: thread.id
  };
}

async function executeCalendarEvent(input: {
  action: Extract<ConnectorActionRequest, { kind: "GOOGLE_EVENT" | "MS_EVENT" }>;
  executionId: string;
  organizationId: string;
  tenantId: string;
  workflowId: string;
}) {
  const provider =
    input.action.kind === "GOOGLE_EVENT" ? "google-workspace" : "microsoft-graph";
  const connectorAccount = await resolveConnectorAccount({
    ...(input.action.connectorAccountId
      ? { connectorAccountId: input.action.connectorAccountId }
      : {}),
    organizationId: input.organizationId,
    provider
  });

  await touchConnectorState({
    connectorAccountId: connectorAccount?.id ?? null,
    metadata: {
      attendees: input.action.attendees ?? [],
      calendarId: input.action.calendarId ?? "primary",
      end: input.action.end,
      executionId: input.executionId,
      start: input.action.start,
      title: input.action.title,
      workflowId: input.workflowId
    },
    organizationId: input.organizationId,
    scope: "calendar:events",
    status: "queued",
    tenantId: input.tenantId
  });

  return {
    calendarId: input.action.calendarId ?? "primary",
    provider,
    queued: true,
    title: input.action.title
  };
}

export async function executeConnectorRuntimeAction(input: {
  action: ConnectorActionRequest;
  executionId: string;
  tenantId: string;
  workflowId: string;
}) {
  const organization = await resolveOrganization({
    tenantId: input.tenantId
  });

  switch (input.action.kind) {
    case "CRM_UPSERT":
      return executeCrmUpsert({
        action: input.action,
        executionId: input.executionId,
        organizationId: organization.id,
        tenantId: input.tenantId,
        workflowId: input.workflowId
      });
    case "WHATSAPP_SEND":
      return executeWhatsappSend({
        action: input.action,
        executionId: input.executionId,
        organizationId: organization.id,
        tenantId: input.tenantId,
        workflowId: input.workflowId
      });
    case "GOOGLE_EVENT":
    case "MS_EVENT":
      return executeCalendarEvent({
        action: input.action,
        executionId: input.executionId,
        organizationId: organization.id,
        tenantId: input.tenantId,
        workflowId: input.workflowId
      });
    default:
      throw new Error(`Unsupported connector runtime action: ${(input.action as { kind: string }).kind}`);
  }
}
