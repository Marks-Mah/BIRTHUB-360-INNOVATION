import { randomBytes } from "node:crypto";

import type { ApiConfig } from "@birthub/config";
import { prisma, WebhookEndpointStatus } from "@birthub/database";

import { ProblemDetailsError } from "../../lib/problem-details.js";
import { enqueueOutboundWebhook } from "../engagement/queues.js";

function buildWebhookSecret(): string {
  return randomBytes(24).toString("hex");
}

async function resolveOrganization(tenantReference: string) {
  const organization = await prisma.organization.findFirst({
    where: {
      OR: [{ id: tenantReference }, { slug: tenantReference }, { tenantId: tenantReference }]
    }
  });

  if (!organization) {
    throw new ProblemDetailsError({
      detail: "Organization not found for the active tenant context.",
      status: 404,
      title: "Not Found"
    });
  }

  return organization;
}

export async function listTenantWebhookEndpoints(tenantReference: string) {
  const organization = await resolveOrganization(tenantReference);
  return prisma.webhookEndpoint.findMany({
    include: {
      _count: {
        select: {
          deliveries: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    },
    where: {
      organizationId: organization.id
    }
  });
}

export async function createTenantWebhookEndpoint(input: {
  createdByUserId?: string | null;
  tenantReference: string;
  topics: string[];
  url: string;
}) {
  const organization = await resolveOrganization(input.tenantReference);
  return prisma.webhookEndpoint.create({
    data: {
      createdByUserId: input.createdByUserId ?? null,
      organizationId: organization.id,
      secret: buildWebhookSecret(),
      tenantId: organization.tenantId,
      topics: input.topics,
      url: input.url
    }
  });
}

export async function updateTenantWebhookEndpoint(input: {
  endpointId: string;
  status?: WebhookEndpointStatus;
  tenantReference: string;
  topics?: string[];
  url?: string;
}) {
  const organization = await resolveOrganization(input.tenantReference);
  const endpoint = await prisma.webhookEndpoint.findFirst({
    where: {
      id: input.endpointId,
      organizationId: organization.id
    }
  });

  if (!endpoint) {
    throw new ProblemDetailsError({
      detail: "Webhook endpoint not found for the active tenant.",
      status: 404,
      title: "Not Found"
    });
  }

  return prisma.webhookEndpoint.update({
    data: {
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.topics !== undefined ? { topics: input.topics } : {}),
      ...(input.url !== undefined ? { url: input.url } : {})
    },
    where: {
      id: endpoint.id
    }
  });
}

export async function listTenantWebhookDeliveries(input: {
  endpointId: string;
  limit?: number;
  tenantReference: string;
}) {
  const organization = await resolveOrganization(input.tenantReference);
  return prisma.webhookDelivery.findMany({
    orderBy: {
      createdAt: "desc"
    },
    take: Math.min(Math.max(input.limit ?? 25, 1), 100),
    where: {
      endpointId: input.endpointId,
      organizationId: organization.id
    }
  });
}

export async function retryWebhookDelivery(input: {
  config: ApiConfig;
  deliveryId: string;
  tenantReference: string;
}) {
  const organization = await resolveOrganization(input.tenantReference);
  const delivery = await prisma.webhookDelivery.findFirst({
    include: {
      endpoint: true
    },
    where: {
      id: input.deliveryId,
      organizationId: organization.id
    }
  });

  if (!delivery) {
    throw new ProblemDetailsError({
      detail: "Webhook delivery not found for the active tenant.",
      status: 404,
      title: "Not Found"
    });
  }

  await enqueueOutboundWebhook(input.config, {
    attempt: 1,
    endpointId: delivery.endpointId,
    organizationId: delivery.organizationId,
    payload: delivery.payload as Record<string, unknown>,
    tenantId: delivery.tenantId,
    topic: delivery.topic
  });

  return {
    endpointId: delivery.endpointId,
    queued: true,
    topic: delivery.topic
  };
}
