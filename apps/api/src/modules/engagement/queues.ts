import type { ApiConfig } from "@birthub/config";
import { Queue } from "bullmq";

import { getBullConnection } from "../../lib/redis.js";

export const engagementQueueNames = {
  crmSync: "engagement.crm-sync",
  outboundWebhook: "engagement.outbound-webhook"
} as const;

export interface CrmSyncJobPayload {
  kind: "company-upsert" | "health-score-sync";
  organizationId: string;
  tenantId: string;
}

export interface OutboundWebhookJobPayload {
  attempt?: number;
  endpointId: string;
  organizationId: string;
  payload: Record<string, unknown>;
  tenantId: string;
  topic: string;
}

type CrmSyncQueue = Queue<CrmSyncJobPayload, void, CrmSyncJobPayload["kind"]>;
type OutboundWebhookQueue = Queue<OutboundWebhookJobPayload, void, OutboundWebhookJobPayload["topic"]>;

const crmSyncQueues = new Map<string, CrmSyncQueue>();
const outboundWebhookQueues = new Map<string, OutboundWebhookQueue>();

function getCrmSyncQueue(config: ApiConfig): CrmSyncQueue {
  const cacheKey = `${config.REDIS_URL}:${engagementQueueNames.crmSync}`;
  const existing = crmSyncQueues.get(cacheKey);

  if (existing) {
    return existing;
  }

  const queue = new Queue<CrmSyncJobPayload, void, CrmSyncJobPayload["kind"]>(
    engagementQueueNames.crmSync,
    {
      connection: getBullConnection(config)
    }
  );
  crmSyncQueues.set(cacheKey, queue);
  return queue;
}

function getOutboundWebhookQueue(config: ApiConfig): OutboundWebhookQueue {
  const cacheKey = `${config.REDIS_URL}:${engagementQueueNames.outboundWebhook}`;
  const existing = outboundWebhookQueues.get(cacheKey);

  if (existing) {
    return existing;
  }

  const queue = new Queue<OutboundWebhookJobPayload, void, OutboundWebhookJobPayload["topic"]>(
    engagementQueueNames.outboundWebhook,
    {
      connection: getBullConnection(config)
    }
  );
  outboundWebhookQueues.set(cacheKey, queue);
  return queue;
}

export async function enqueueCrmSync(
  config: ApiConfig,
  payload: CrmSyncJobPayload
): Promise<void> {
  await getCrmSyncQueue(config).add(
    payload.kind,
    payload,
    {
      removeOnComplete: {
        count: 100
      },
      removeOnFail: {
        count: 250
      }
    }
  );
}

export async function enqueueOutboundWebhook(
  config: ApiConfig,
  payload: OutboundWebhookJobPayload
): Promise<void> {
  await getOutboundWebhookQueue(config).add(payload.topic, payload, {
    attempts: 5,
    backoff: {
      delay: 1_500,
      type: "exponential"
    },
    removeOnComplete: {
      count: 200
    },
    removeOnFail: {
      count: 300
    }
  });
}
