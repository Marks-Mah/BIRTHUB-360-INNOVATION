import { getWorkerConfig, taskJobSchema } from "@birthub/config";
import {
  createNotificationForOrganizationRoles,
  createNotificationForUser,
  ExecutionSource,
  NotificationType,
  Prisma,
  prisma
} from "@birthub/database";
import { createLogger } from "@birthub/logger";
import { Queue, Worker } from "bullmq";
import { createHash, createHmac } from "node:crypto";
import { z } from "zod";
import { Redis } from "ioredis";

import {
  WorkflowRunner,
  type WorkflowExecutionJobPayload,
  type WorkflowTriggerJobPayload,
  workflowQueueNames
} from "./engine/runner.js";
import { executeManifestAgentRuntime } from "./agents/runtime.js";
import { persistAgentHandoff } from "./agents/handoffs.js";
import { syncOrganizationToHubspot } from "./integrations/hubspot.js";
import { executeConnectorRuntimeAction } from "./integrations/connectors.runtime.js";
import {
  emailQueueName,
  enqueueEmailNotification,
  processEmailNotificationJob,
  type EmailNotificationJobPayload
} from "./notifications/emailQueue.js";
import { DynamicRateLimiter } from "./lib/rate-limiter.js";
import { getQueueNameForPriority } from "./queues/agentQueue.js";
import { executeTenantJob } from "./tenant-execution.js";
import {
  enqueueWebhookTopicDeliveries,
  outboundWebhookQueueName,
  processOutboundWebhookJob,
  type OutboundWebhookJobPayload
} from "./webhooks/outbound.js";

const logger = createLogger("worker");
const crmSyncQueueName = "engagement.crm-sync";

function toJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

function hashPayload(payload: string): string {
  return createHash("sha256").update(payload, "utf8").digest("hex");
}

function serializeLegacyTaskSignaturePayload(input: {
  context: NonNullable<z.infer<typeof taskJobSchema>["context"]>;
  payload: z.infer<typeof taskJobSchema>;
}): string {
  return JSON.stringify({
    agentId: input.payload.agentId,
    approvalRequired: input.payload.approvalRequired,
    context: input.context,
    estimatedCostBRL: input.payload.estimatedCostBRL,
    executionMode: input.payload.executionMode,
    payload: input.payload.payload,
    requestId: input.payload.requestId,
    tenantId: input.payload.tenantId,
    type: input.payload.type,
    userId: input.payload.userId,
    version: input.payload.version
  });
}

export function validateLegacyTaskJob(input: {
  fallbackSecret: string;
  jobId: string;
  payload: z.infer<typeof taskJobSchema>;
  tenantSecret?: string;
}): string {
  const context = input.payload.context ?? {
    actorId: input.payload.userId ?? "system",
    jobId: input.jobId,
    organizationId: input.payload.tenantId ?? "default-tenant",
    scopedAt: new Date().toISOString(),
    tenantId: input.payload.tenantId ?? "default-tenant"
  };

  if (!input.payload.tenantId || input.payload.tenantId !== context.tenantId) {
    throw new Error("JOB_CONTEXT_TENANT_MISMATCH");
  }

  if (!input.payload.userId || input.payload.userId !== context.actorId) {
    throw new Error("JOB_CONTEXT_ACTOR_MISMATCH");
  }

  if (context.jobId !== input.jobId) {
    throw new Error("JOB_CONTEXT_ID_MISMATCH");
  }

  const signedPayload = serializeLegacyTaskSignaturePayload({
    context,
    payload: input.payload
  });
  const expectedSignature = signPayload(
    signedPayload,
    input.tenantSecret ?? input.fallbackSecret
  );

  if (input.payload.signature !== "unsigned" && expectedSignature !== input.payload.signature) {
    throw new Error("JOB_SIGNATURE_INVALID");
  }

  return input.payload.tenantId;
}

export interface WorkerRuntime {
  close: () => Promise<void>;
  connection: Redis;
  workers: Worker[];
}

const agentExecutionJobSchema = z
  .object({
    agentId: z.string().min(1),
    catalogAgentId: z.string().min(1).optional(),
    executionId: z.string().min(1),
    input: z.record(z.string(), z.unknown()),
    organizationId: z.string().min(1).optional(),
    tenantId: z.string().min(1),
    userId: z.string().min(1).optional(),
    toolCalls: z
      .array(
        z.object({
          input: z.unknown(),
          tool: z.string().min(1)
        })
      )
      .optional()
  })
  .strict();

type CrmSyncJobPayload = {
  kind: "company-upsert" | "health-score-sync";
  organizationId: string;
  tenantId: string;
};

function humanizeAgentId(agentId: string): string {
  return agentId.replace(/[-_]/g, " ").trim().toUpperCase();
}

async function resolveOrganizationReference(tenantReference: string) {
  return prisma.organization.findFirst({
    where: {
      OR: [{ id: tenantReference }, { tenantId: tenantReference }]
    }
  });
}

async function persistExecutionStarted(input: {
  agentId: string;
  executionId: string;
  inputPayload: Record<string, unknown>;
  organizationId?: string | null;
  source: ExecutionSource;
  tenantId: string;
  userId?: string | null;
}) {
  await prisma.agentExecution.upsert({
    create: {
      agentId: input.agentId,
      id: input.executionId,
      input: toJsonValue(input.inputPayload),
      organizationId: input.organizationId ?? null,
      source: input.source,
      tenantId: input.tenantId,
      userId: input.userId ?? null
    },
    update: {
      agentId: input.agentId,
      input: toJsonValue(input.inputPayload),
      organizationId: input.organizationId ?? null,
      source: input.source,
      status: "RUNNING",
      tenantId: input.tenantId,
      userId: input.userId ?? null
    },
    where: {
      id: input.executionId
    }
  });
}

async function persistExecutionFinished(input: {
  errorMessage?: string;
  executionId: string;
  metadata?: Record<string, unknown>;
  output?: Record<string, unknown>;
  outputHash?: string;
  status: "FAILED" | "SUCCESS" | "WAITING_APPROVAL";
}) {
  await prisma.agentExecution.update({
    data: {
      completedAt: input.status === "WAITING_APPROVAL" ? null : new Date(),
      errorMessage: input.errorMessage ?? null,
      outputHash: input.outputHash ?? null,
      ...(input.metadata !== undefined ? { metadata: toJsonValue(input.metadata) } : {}),
      ...(input.output !== undefined ? { output: toJsonValue(input.output) } : {}),
      status: input.status
    },
    where: {
      id: input.executionId
    }
  });
}

async function fanOutExecutionOutcome(input: {
  agentId: string;
  emailQueue: Queue<EmailNotificationJobPayload>;
  errorMessage?: string;
  executionId: string;
  organizationId?: string | null;
  outboundWebhookQueue: Queue<OutboundWebhookJobPayload>;
  status: "FAILED" | "SUCCESS" | "WAITING_APPROVAL";
  tenantId: string;
  userId?: string | null;
  webBaseUrl: string;
}) {
  if (!input.organizationId) {
    return;
  }

  const link = `${input.webBaseUrl}/outputs?executionId=${encodeURIComponent(input.executionId)}`;
  const agentLabel = humanizeAgentId(input.agentId);

  if (input.status === "FAILED") {
    if (input.userId) {
      await createNotificationForUser({
        content: `O Agente ${agentLabel} falhou ao rodar.`,
        link,
        metadata: {
          errorMessage: input.errorMessage ?? null,
          executionId: input.executionId
        },
        organizationId: input.organizationId,
        tenantId: input.tenantId,
        type: NotificationType.AGENT_FAILED,
        userId: input.userId
      });

      await enqueueEmailNotification(input.emailQueue, {
        context: {
          agentId: input.agentId,
          errorMessage: input.errorMessage ?? "Falha nao detalhada.",
          executionId: input.executionId,
          link
        },
        organizationId: input.organizationId,
        tenantId: input.tenantId,
        type: "critical_error",
        userId: input.userId
      });
    } else {
      await createNotificationForOrganizationRoles({
        content: `O Agente ${agentLabel} falhou ao rodar.`,
        link,
        metadata: {
          errorMessage: input.errorMessage ?? null,
          executionId: input.executionId
        },
        organizationId: input.organizationId,
        tenantId: input.tenantId,
        type: NotificationType.AGENT_FAILED
      });
    }
  }

  if (input.status === "WAITING_APPROVAL") {
    if (input.userId) {
      await createNotificationForUser({
        content: `O Agente ${agentLabel} concluiu a execucao e aguarda aprovacao do output.`,
        link,
        metadata: {
          executionId: input.executionId
        },
        organizationId: input.organizationId,
        tenantId: input.tenantId,
        type: NotificationType.INFO,
        userId: input.userId
      });
    } else {
      await createNotificationForOrganizationRoles({
        content: `O Agente ${agentLabel} concluiu a execucao e aguarda aprovacao do output.`,
        link,
        metadata: {
          executionId: input.executionId
        },
        organizationId: input.organizationId,
        tenantId: input.tenantId,
        type: NotificationType.INFO
      });
    }
  }

  if (input.status === "SUCCESS" && input.userId) {
    await enqueueEmailNotification(input.emailQueue, {
      context: {
        agentId: input.agentId,
        executionId: input.executionId,
        link
      },
      organizationId: input.organizationId,
      tenantId: input.tenantId,
      type: "workflow_completed",
      userId: input.userId
    });
  }

  await enqueueWebhookTopicDeliveries(input.outboundWebhookQueue, {
    organizationId: input.organizationId,
    payload: {
      agentId: input.agentId,
      errorMessage: input.errorMessage ?? null,
      executionId: input.executionId,
      status: input.status,
      tenantId: input.tenantId
    },
    tenantId: input.tenantId,
    topic:
      input.status === "SUCCESS"
        ? "agent.finished"
        : input.status === "WAITING_APPROVAL"
          ? "agent.awaiting_approval"
          : "agent.failed"
  });
}

function billingCacheKey(tenantReference: string): string {
  return `billing-status:${tenantReference}`;
}

function calculateGraceBoundary(updatedAt: Date, gracePeriodDays: number): Date {
  return new Date(updatedAt.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000);
}

export function createBirthHubWorker(): WorkerRuntime {
  const config = getWorkerConfig();
  const connection = new Redis(config.REDIS_URL, {
    maxRetriesPerRequest: null
  });
  const bullConnection = connection as never;
  const workflowExecutionQueue = new Queue<WorkflowExecutionJobPayload>(
    workflowQueueNames.execution,
    {
      connection: bullConnection,
      defaultJobOptions: {
        attempts: 5,
        backoff: {
          delay: 1000,
          type: "exponential"
        },
        removeOnComplete: {
          count: 500
        },
        removeOnFail: {
          count: 500
        }
      }
    }
  );
  const emailQueue = new Queue<EmailNotificationJobPayload>(emailQueueName, {
    connection: bullConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        delay: 1_000,
        type: "exponential"
      },
      removeOnComplete: {
        count: 200
      },
      removeOnFail: {
        count: 200
      }
    }
  });
  const outboundWebhookQueue = new Queue<OutboundWebhookJobPayload>(outboundWebhookQueueName, {
    connection: bullConnection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        delay: 1_500,
        type: "exponential"
      },
      removeOnComplete: {
        count: 300
      },
      removeOnFail: {
        count: 300
      }
    }
  });
  const dynamicRateLimiter = new DynamicRateLimiter(connection);
  const workflowRunner = new WorkflowRunner(workflowExecutionQueue, {
    httpRequestRateLimiter: dynamicRateLimiter,
    agentExecutor: {
      execute: async ({ agentId, contextSummary, input }) => {
        const tenantId = (input.tenantId as string | undefined) ?? "default-tenant";
        const organization = await resolveOrganizationReference(tenantId);
        const executionId = `workflow-agent:${Date.now()}:${agentId}`;

        await persistExecutionStarted({
          agentId,
          executionId,
          inputPayload: {
            ...input,
            workflowContextSummary: contextSummary
          },
          organizationId: organization?.id ?? null,
          source: ExecutionSource.WORKFLOW,
          tenantId,
          userId: null
        });

        try {
          const runtimeResult = await executeManifestAgentRuntime({
            agentId,
            catalogAgentId: agentId,
            contextSummary,
            executionId,
            input: {
              ...input,
              workflowContextSummary: contextSummary
            },
            organizationId: organization?.id ?? null,
            redis: connection,
            source: "WORKFLOW",
            tenantId,
            userId: null
          });

          await persistExecutionFinished({
            executionId,
            metadata: runtimeResult.metadata,
            output: runtimeResult.output,
            outputHash: runtimeResult.outputHash,
            status: runtimeResult.status
          });

          return runtimeResult.output;
        } catch (error) {
          await persistExecutionFinished({
            errorMessage: error instanceof Error ? error.message : "Workflow agent execution failed",
            executionId,
            status: "FAILED"
          });
          throw error;
        }
      }
    },
    connectorExecutor: {
      execute: async ({ action, executionId, tenantId, workflowId }) =>
        executeConnectorRuntimeAction({
          action,
          executionId,
          tenantId,
          workflowId
        })
    },
    handoffExecutor: {
      execute: async (args) =>
        persistAgentHandoff({
          context: args.context,
          contextSummary: args.contextSummary,
          correlationId: args.correlationId,
          executionId: args.executionId,
          sourceAgentId: args.sourceAgentId,
          summary: args.summary,
          targetAgentId: args.targetAgentId,
          tenantId: args.tenantId,
          ...(args.threadId ? { threadId: args.threadId } : {}),
          workflowId: args.workflowId
        })
    },
    notificationDispatcher: {
      send: async (message) => {
        logger.info({ message }, "Workflow notification dispatched");
      }
    }
  });

  const resolveBillingLock = async (
    tenantReference: string
  ): Promise<{ locked: boolean; status: string | null }> => {
    const cached = await connection.get(billingCacheKey(tenantReference));

    if (cached) {
      return JSON.parse(cached) as { locked: boolean; status: string | null };
    }

    const organization = await prisma.organization.findFirst({
      include: {
        subscriptions: {
          orderBy: {
            updatedAt: "desc"
          },
          take: 1
        }
      },
      where: {
        OR: [{ id: tenantReference }, { tenantId: tenantReference }]
      }
    });
    const subscription = organization?.subscriptions[0] ?? null;
    const status = subscription?.status ?? null;
    const graceBoundary =
      subscription && status === "past_due"
        ? subscription.gracePeriodEndsAt ?? calculateGraceBoundary(subscription.updatedAt, config.BILLING_GRACE_PERIOD_DAYS)
        : null;
    const locked = Boolean(status === "past_due" && graceBoundary && graceBoundary.getTime() <= Date.now());
    const payload = {
      locked,
      status
    };

    await connection.set(
      billingCacheKey(tenantReference),
      JSON.stringify(payload),
      "EX",
      config.BILLING_STATUS_CACHE_TTL_SECONDS
    );

    return payload;
  };

  const processJob = async (job: {
    id?: string | number;
    data: unknown;
    queueName: string;
  }) => {
    const jobId = String(job.id ?? "unknown");
    const isLegacyJob = job.queueName === config.QUEUE_NAME;
    const executionPayload = await (async () => {
      if (isLegacyJob) {
        const payload = taskJobSchema.parse(job.data);
        const organization = await resolveOrganizationReference(payload.tenantId ?? "default-tenant");
        const tenantSecret = organization
          ? await prisma.jobSigningSecret.findFirst({
              where: {
                tenantId: organization.tenantId
              }
            })
          : null;
        const tenantId = validateLegacyTaskJob({
          fallbackSecret: config.JOB_HMAC_GLOBAL_SECRET,
          jobId,
          payload,
          ...(tenantSecret?.secret ? { tenantSecret: tenantSecret.secret } : {})
        });

        return {
          agentId: payload.type,
          approvalRequired: payload.approvalRequired,
          catalogAgentId: null,
          executionId: `${payload.requestId}:${jobId}`,
          executionMode: payload.executionMode,
          input: payload.payload,
          organizationId: organization?.id ?? null,
          requestId: payload.requestId,
          source: ExecutionSource.MANUAL,
          tenantId,
          toolCalls: undefined,
          userId: payload.userId ?? null
        };
      }

      const payload = agentExecutionJobSchema.parse(job.data);
      const organization = payload.organizationId
        ? await resolveOrganizationReference(payload.organizationId)
        : await resolveOrganizationReference(payload.tenantId);

      return {
        ...payload,
        approvalRequired: false,
        catalogAgentId: payload.catalogAgentId ?? null,
        executionMode: "LIVE" as const,
        organizationId: organization?.id ?? payload.organizationId ?? null,
        requestId: payload.executionId,
        source: ExecutionSource.MANUAL
      };
    })();

    await persistExecutionStarted({
      agentId: executionPayload.agentId,
      executionId: executionPayload.executionId,
      inputPayload: executionPayload.input,
      organizationId: executionPayload.organizationId,
      source: executionPayload.source,
      tenantId: executionPayload.tenantId,
      userId: executionPayload.userId ?? null
    });

    return executeTenantJob(
      {
        requestId: executionPayload.requestId,
        tenantId: executionPayload.tenantId,
        userId: executionPayload.userId ?? executionPayload.agentId
      },
      async () => {
        try {
          const billing = await resolveBillingLock(executionPayload.tenantId);
          if (billing.locked) {
            logger.warn(
              {
                executionId: executionPayload.executionId,
                status: billing.status,
                tenantId: executionPayload.tenantId
              },
              "Worker aborted execution due to billing lock"
            );

            await persistExecutionFinished({
              errorMessage: "billing_past_due",
              executionId: executionPayload.executionId,
              status: "FAILED"
            });

            await fanOutExecutionOutcome({
              agentId: executionPayload.agentId,
              emailQueue,
              errorMessage: "billing_past_due",
              executionId: executionPayload.executionId,
              organizationId: executionPayload.organizationId,
            outboundWebhookQueue,
            status: "FAILED",
            tenantId: executionPayload.tenantId,
            userId: executionPayload.userId ?? null,
            webBaseUrl: config.WEB_BASE_URL
          });

            return {
              blocked: true,
              blockedAt: new Date().toISOString(),
              reason: "billing_past_due"
            };
          }

          logger.info(
            {
              executionId: executionPayload.executionId,
              jobId: job.id,
              queue: job.queueName
            },
            "Worker started job"
          );

          if (executionPayload.executionMode === "DRY_RUN") {
            const output = {
              logs: ["Simulating LLM call...", "Returning MOCK_DATA"],
              mode: executionPayload.executionMode
            };
            const outputHash = hashPayload(JSON.stringify(output));

            await persistExecutionFinished({
              executionId: executionPayload.executionId,
              metadata: {
                dryRun: true
              },
              output,
              outputHash,
              status: "SUCCESS"
            });

            return {
              completedAt: new Date().toISOString(),
              executionId: executionPayload.executionId,
              outputHash,
              requestId: executionPayload.requestId,
              status: "COMPLETED"
            };
          }

          if (executionPayload.approvalRequired) {
            const output = {
              message: "Awaiting human approval before final output."
            };
            const outputHash = hashPayload(JSON.stringify(output));

            await persistExecutionFinished({
              executionId: executionPayload.executionId,
              output,
              outputHash,
              status: "WAITING_APPROVAL"
            });

            return {
              completedAt: new Date().toISOString(),
              executionId: executionPayload.executionId,
              outputHash,
              requestId: executionPayload.requestId,
              status: "WAITING_APPROVAL"
            };
          }

          const runtimeResult = await executeManifestAgentRuntime({
            agentId: executionPayload.agentId,
            catalogAgentId: executionPayload.catalogAgentId,
            executionId: executionPayload.executionId,
            input: executionPayload.input,
            organizationId: executionPayload.organizationId,
            redis: connection,
            source: "MANUAL",
            tenantId: executionPayload.tenantId,
            userId: executionPayload.userId ?? null
          });

          await persistExecutionFinished({
            executionId: executionPayload.executionId,
            metadata: runtimeResult.metadata,
            output: runtimeResult.output,
            outputHash: runtimeResult.outputHash,
            status: runtimeResult.status
          });

          await fanOutExecutionOutcome({
            agentId: executionPayload.agentId,
            emailQueue,
            executionId: executionPayload.executionId,
            organizationId: executionPayload.organizationId,
            outboundWebhookQueue,
            status: runtimeResult.status,
            tenantId: executionPayload.tenantId,
            userId: executionPayload.userId ?? null,
            webBaseUrl: config.WEB_BASE_URL
          });

          logger.info(
            {
              executionId: executionPayload.executionId,
              jobId: job.id,
              steps: (runtimeResult.metadata.steps as number | undefined) ?? 0
            },
            "Worker finished job"
          );

          return {
            completedAt: new Date().toISOString(),
            executionId: executionPayload.executionId,
            outputHash: runtimeResult.outputHash,
            requestId: executionPayload.requestId
          };
        } catch (error) {
          const message =
            error instanceof Error ? error.message : "Unknown agent execution failure";

          await persistExecutionFinished({
            errorMessage: message,
            executionId: executionPayload.executionId,
            status: "FAILED"
          });

          await fanOutExecutionOutcome({
            agentId: executionPayload.agentId,
            emailQueue,
            errorMessage: message,
            executionId: executionPayload.executionId,
            organizationId: executionPayload.organizationId,
            outboundWebhookQueue,
            status: "FAILED",
            tenantId: executionPayload.tenantId,
            userId: executionPayload.userId ?? null,
            webBaseUrl: config.WEB_BASE_URL
          });

          throw error;
        }
      }
    );
  };

  const queueNames = [
    config.QUEUE_NAME,
    getQueueNameForPriority("high"),
    getQueueNameForPriority("normal"),
    getQueueNameForPriority("low")
  ];

  const workers = queueNames.map((queueName) =>
    new Worker(
      queueName,
      async (job) =>
        processJob({
          data: job.data,
          queueName,
          ...(job.id !== undefined ? { id: job.id } : {})
        }),
      {
        concurrency: config.WORKER_CONCURRENCY,
        connection: bullConnection
      }
    )
  );

  workers.push(
    new Worker(
      workflowQueueNames.execution,
      async (job) =>
        workflowRunner.processExecutionJob(job.data as WorkflowExecutionJobPayload),
      {
        concurrency: config.WORKER_CONCURRENCY,
        connection: bullConnection
      }
    )
  );

  workers.push(
    new Worker(
      workflowQueueNames.trigger,
      async (job) =>
        workflowRunner.processTriggerJob(job.data as WorkflowTriggerJobPayload),
      {
        concurrency: config.WORKER_CONCURRENCY,
        connection: bullConnection
      }
    )
  );

  workers.push(
    new Worker(
      emailQueueName,
      async (job) => processEmailNotificationJob(job.data as EmailNotificationJobPayload),
      {
        concurrency: Math.max(1, Math.floor(config.WORKER_CONCURRENCY / 2)),
        connection: bullConnection
      }
    )
  );

  workers.push(
    new Worker(
      outboundWebhookQueueName,
      async (job) => processOutboundWebhookJob(job.data as OutboundWebhookJobPayload, { redis: connection }),
      {
        concurrency: config.WORKER_CONCURRENCY,
        connection: bullConnection
      }
    )
  );

  workers.push(
    new Worker(
      crmSyncQueueName,
      async (job) => {
        const payload = job.data as CrmSyncJobPayload;
        await syncOrganizationToHubspot({
          organizationId: payload.organizationId,
          tenantId: payload.tenantId
        });
      },
      {
        concurrency: Math.max(1, Math.floor(config.WORKER_CONCURRENCY / 2)),
        connection: bullConnection
      }
    )
  );

  workers.forEach((worker) => {
    worker.on("failed", (job, error) => {
      logger.error(
        {
          error,
          jobId: job?.id,
          queue: worker.name
        },
        "Worker job failed"
      );
    });
  });

  const close = async (): Promise<void> => {
    await Promise.all(workers.map((worker) => worker.close()));
    await workflowExecutionQueue.close();
    await emailQueue.close();
    await outboundWebhookQueue.close();
    await connection.quit();
  };

  return {
    close,
    connection,
    workers
  };
}
