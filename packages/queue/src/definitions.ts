import { QueueName } from "@birthub/shared-types";

export const QUEUE_CONFIG: Record<
  string,
  {
    attempts: number;
    priority?: number;
    backoff?: any;
    cron?: string;
    removeOnFail?: { count: number };
    removeOnComplete?: { count: number };
  }
> = {
  // Agent Queues
  [QueueName.SDR_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.LDR_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.AE_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.ANALISTA_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.FINANCEIRO_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.JURIDICO_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.MARKETING_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.POS_VENDA_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.BDR_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.CLOSER_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.SALES_OPS_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.ENABLEMENT_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.KAM_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.PARTNERS_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.FIELD_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.PRE_SALES_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.COPYWRITER_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },
  [QueueName.SOCIAL_QUEUE]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
  },

  // Task Queues
  [QueueName.LEAD_ENRICHMENT]: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
    priority: 10,
    removeOnFail: { count: 1000 },
    removeOnComplete: { count: 100 },
  },
  [QueueName.DEAL_CLOSED_WON]: {
    attempts: 5,
    backoff: { type: "fixed", delay: 1000 },
    priority: 10,
    removeOnFail: { count: 1000 },
    removeOnComplete: { count: 100 },
  },
  [QueueName.HEALTH_ALERT]: { attempts: 4, backoff: { type: "exponential", delay: 800 }, priority: 9 },
  [QueueName.CHURN_RISK_HIGH]: { attempts: 4, backoff: { type: "exponential", delay: 800 }, priority: 9 },
  [QueueName.HEALTH_SCORE_UPDATE]: { attempts: 3, priority: 8 },
  [QueueName.EMAIL_CADENCE_SEND]: { attempts: 3, priority: 5 },
  [QueueName.INVOICE_GENERATE]: { attempts: 5, priority: 7 },
  [QueueName.NPS_ANALYSIS]: { attempts: 2, priority: 5 },
  [QueueName.CONTRACT_ANALYSIS]: { attempts: 2, priority: 6 },
  [QueueName.BANK_RECONCILIATION]: {
    attempts: 2,
    priority: 2,
    cron: "0 2 * * *",
  },
  [QueueName.COMMISSION_CALC]: { attempts: 3, priority: 3, cron: "0 18 L * *" },
  [QueueName.BOARD_REPORT]: { attempts: 2, priority: 2, cron: "0 17 * * 5" },
  [QueueName.CONTRACT_DEADLINES]: {
    attempts: 2,
    priority: 4,
    cron: "0 8 * * 1",
  },
  [QueueName.DOMAIN_WARMUP]: { attempts: 1, priority: 1, cron: "*/30 * * * *" },
};
