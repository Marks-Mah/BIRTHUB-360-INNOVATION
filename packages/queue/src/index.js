import { Queue, Worker, QueueEvents } from "bullmq";
import IORedis from "ioredis";
import { QueueName } from "@birthub/shared-types";
import { QUEUE_CONFIG } from "./definitions";
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
export class QueueManager {
    connection;
    queues = new Map();
    constructor(redisUrl = REDIS_URL) {
        this.connection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    }
    createQueue(name) {
        if (this.queues.has(name)) {
            return this.queues.get(name);
        }
        const queue = new Queue(name, { connection: this.connection });
        this.queues.set(name, queue);
        return queue;
    }
    createWorker(name, processor) {
        return new Worker(name, processor, { connection: this.connection });
    }
    createQueueEvents(name) {
        return new QueueEvents(name, { connection: this.connection });
    }
    async addJob(queueName, jobName, data, opts) {
        const queue = this.createQueue(queueName);
        return await queue.add(jobName, data, opts);
    }
    async scheduleRecurringJobs() {
        for (const [name, cfg] of Object.entries(QUEUE_CONFIG)) {
            if (!cfg.cron)
                continue;
            const repeatJobId = `${name.toLowerCase()}-cron`;
            const queue = this.createQueue(name);
            await queue.add(`${name.toLowerCase()}-scheduled`, { queue: name, scheduled: true }, {
                jobId: repeatJobId,
                repeat: { pattern: cfg.cron },
                removeOnComplete: 20,
                attempts: cfg.attempts,
                priority: cfg.priority,
            });
        }
    }
    async close() {
        await Promise.all(Array.from(this.queues.values()).map((queue) => queue.close()));
        this.queues.clear();
        await this.connection.quit();
    }
}
let manager = null;
function getManager() {
    if (!manager)
        manager = new QueueManager();
    return manager;
}
export function scopedQueueName(baseQueue, tenantId, plan) {
    if (!tenantId)
        return baseQueue;
    const tenantSafe = String(tenantId).replace(/[^a-zA-Z0-9_-]/g, "-");
    const planSafe = plan ? String(plan).replace(/[^a-zA-Z0-9_-]/g, "-") : "default";
    return `${baseQueue}__tenant_${tenantSafe}__plan_${planSafe}`;
}
export const createQueue = (name) => getManager().createQueue(name);
export const createWorker = (name, processor) => getManager().createWorker(name, processor);
export const createQueueEvents = (name) => getManager().createQueueEvents(name);
export const closeRedis = async () => {
    if (!manager)
        return;
    await manager.close();
    manager = null;
};
export const QUEUES = {
    LEAD_ENRICHMENT: QueueName.LEAD_ENRICHMENT,
    DEAL_CLOSED_WON: QueueName.DEAL_CLOSED_WON,
    HEALTH_ALERT: QueueName.HEALTH_ALERT,
    CHURN_RISK_HIGH: QueueName.CHURN_RISK_HIGH,
    HEALTH_SCORE_UPDATE: QueueName.HEALTH_SCORE_UPDATE,
    EMAIL_CADENCE_SEND: QueueName.EMAIL_CADENCE_SEND,
    INVOICE_GENERATE: QueueName.INVOICE_GENERATE,
    NPS_ANALYSIS: QueueName.NPS_ANALYSIS,
    CONTRACT_ANALYSIS: QueueName.CONTRACT_ANALYSIS,
    BANK_RECONCILIATION: QueueName.BANK_RECONCILIATION,
    COMMISSION_CALC: QueueName.COMMISSION_CALC,
    BOARD_REPORT: QueueName.BOARD_REPORT,
    CONTRACT_DEADLINES: QueueName.CONTRACT_DEADLINES,
    DOMAIN_WARMUP: QueueName.DOMAIN_WARMUP,
};
export * from "./workers";
export * from "./job-context";
export * from "./definitions.js";
