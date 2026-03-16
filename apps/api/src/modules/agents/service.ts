import { createHash, randomUUID } from "node:crypto";

import {
  createPolicyTemplate,
  type ManagedAgentPolicy,
  type AgentManifest,
} from "@birthub/agents-core";
import { getApiConfig } from "@birthub/config";
import { prisma } from "@birthub/database";

import { toPrismaJsonValue } from "../../lib/prisma-json.js";
import { decryptConnectorsMap } from "../../lib/encryption.js";
import {
  QueueBackpressureError,
  TenantQueueRateLimitError
} from "../../lib/queue.js";
import { ProblemDetailsError } from "../../lib/problem-details.js";
import { marketplaceService } from "../marketplace/marketplace-service.js";
import { enqueueInstalledAgentExecution } from "./queue.js";

type AgentConfigSnapshot = {
  connectors: Record<string, unknown>;
  installedAt: string | null;
  installedVersion: string;
  latestAvailableVersion: string;
  managedPolicies: ManagedAgentPolicy[];
  packId: string | null;
  runtimeProvider: "manifest-runtime" | "python-orchestrator";
  sourceAgentId: string | null;
  status: string;
};

type InstalledAgentExecutionRow = {
  durationMs: number;
  id: string;
  mode: "DRY_RUN" | "LIVE" | "UNKNOWN";
  startedAt: string;
  status: "FAILED" | "RUNNING" | "SUCCESS";
};

type AgentRecord = Exclude<Awaited<ReturnType<typeof prisma.agent.findFirst>>, null>;
type AgentExecutionRecord = Awaited<ReturnType<typeof prisma.agentExecution.findMany>>[number];

export interface InstalledAgentSnapshot {
  catalogAgentId: string;
  connectors: Record<string, unknown>;
  executionCount: number;
  executions: InstalledAgentExecutionRow[];
  failRate: number;
  id: string;
  keywords: string[];
  lastRun: string | null;
  logs: string[];
  manifest: AgentManifest;
  name: string;
  runtimeProvider: "manifest-runtime" | "python-orchestrator";
  sourceStatus: string;
  status: string;
  tags: string[];
  version: string;
}

function buildPayloadHash(payload: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

function canFallbackDatabase(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "PrismaClientInitializationError" ||
    error.name === "PrismaClientRustPanicError" ||
    /DATABASE_URL/i.test(error.message)
  );
}

function flattenTags(manifest: AgentManifest): string[] {
  return Array.from(
    new Set(
      [
        ...manifest.tags.domain,
        ...manifest.tags.industry,
        ...manifest.tags.level,
        ...manifest.tags.persona,
        ...manifest.tags["use-case"]
      ].map((tag) => tag.trim())
    )
  );
}

function mapExecutionStatus(status: string): "FAILED" | "RUNNING" | "SUCCESS" {
  if (status === "FAILED") {
    return "FAILED";
  }

  if (status === "RUNNING" || status === "WAITING_APPROVAL") {
    return "RUNNING";
  }

  return "SUCCESS";
}

function extractDurationMs(input: {
  completedAt: Date | null;
  startedAt: Date;
}): number {
  if (!input.completedAt) {
    return 0;
  }

  return Math.max(0, input.completedAt.getTime() - input.startedAt.getTime());
}

function extractLogs(metadata: unknown): string[] {
  if (!metadata || typeof metadata !== "object") {
    return [];
  }

  const logs = (metadata as { logs?: unknown }).logs;
  return Array.isArray(logs)
    ? logs.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    : [];
}

function extractPayloadHash(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const candidate = (metadata as { payloadHash?: unknown }).payloadHash;
  return typeof candidate === "string" ? candidate : null;
}

function extractExecutionMode(execution: AgentExecutionRecord): "DRY_RUN" | "LIVE" | "UNKNOWN" {
  if (execution.output && typeof execution.output === "object") {
    const candidate = (execution.output as { executionMode?: unknown }).executionMode;
    if (candidate === "DRY_RUN" || candidate === "LIVE") {
      return candidate;
    }
  }

  if (execution.metadata && typeof execution.metadata === "object") {
    const candidate = (execution.metadata as { dryRun?: unknown }).dryRun;
    if (candidate === true) {
      return "DRY_RUN";
    }

    const runtimeProvider = (execution.metadata as { runtimeProvider?: unknown }).runtimeProvider;
    if (typeof runtimeProvider === "string") {
      return "LIVE";
    }
  }

  return "UNKNOWN";
}

function parseAgentConfig(config: unknown): AgentConfigSnapshot {
  if (!config || typeof config !== "object") {
    return {
      connectors: {},
      installedAt: null,
      installedVersion: "1.0.0",
      latestAvailableVersion: "1.0.0",
      managedPolicies: [],
      packId: null,
      runtimeProvider: "manifest-runtime",
      sourceAgentId: null,
      status: "installed"
    };
  }

  const candidate = config as Record<string, unknown>;
  const rawConnectors =
    candidate.connectors && typeof candidate.connectors === "object" && !Array.isArray(candidate.connectors)
      ? (candidate.connectors as Record<string, unknown>)
      : {};
  const connectors = decryptConnectorsMap(rawConnectors);
  const managedPolicies = Array.isArray(candidate.managedPolicies)
    ? candidate.managedPolicies
        .filter((value): value is ManagedAgentPolicy => {
          if (!value || typeof value !== "object") {
            return false;
          }

          const policy = value as Record<string, unknown>;
          return (
            typeof policy.id === "string" &&
            typeof policy.name === "string" &&
            typeof policy.effect === "string" &&
            Array.isArray(policy.actions)
          );
        })
        .map((policy) => {
          const effect: ManagedAgentPolicy["effect"] =
            policy.effect === "deny" ? "deny" : "allow";

          return {
            actions: policy.actions.filter((value): value is string => typeof value === "string"),
            effect,
            id: policy.id,
            name: policy.name,
            ...(typeof policy.enabled === "boolean" ? { enabled: policy.enabled } : {}),
            ...(typeof policy.reason === "string" ? { reason: policy.reason } : {})
          } satisfies ManagedAgentPolicy;
        })
    : [];
  const runtime =
    candidate.runtime && typeof candidate.runtime === "object" && candidate.runtime !== null
      ? (candidate.runtime as Record<string, unknown>)
      : {};

  return {
    connectors,
    installedAt: typeof candidate.installedAt === "string" ? candidate.installedAt : null,
    installedVersion:
      typeof candidate.installedVersion === "string" ? candidate.installedVersion : "1.0.0",
    latestAvailableVersion:
      typeof candidate.latestAvailableVersion === "string"
        ? candidate.latestAvailableVersion
        : typeof candidate.installedVersion === "string"
          ? candidate.installedVersion
          : "1.0.0",
    managedPolicies,
    packId: typeof candidate.packId === "string" ? candidate.packId : null,
    runtimeProvider:
      runtime.provider === "python-orchestrator" ? "python-orchestrator" : "manifest-runtime",
    sourceAgentId: typeof candidate.sourceAgentId === "string" ? candidate.sourceAgentId : null,
    status: typeof candidate.status === "string" ? candidate.status : "installed"
  };
}

function normalizeConfigObject(config: unknown): Record<string, unknown> {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return {};
  }

  return { ...(config as Record<string, unknown>) };
}

function mergeManagedPolicies(
  currentPolicies: ManagedAgentPolicy[],
  nextPolicy: ManagedAgentPolicy
): ManagedAgentPolicy[] {
  const merged = new Map<string, ManagedAgentPolicy>();

  for (const policy of [...currentPolicies, nextPolicy]) {
    merged.set(policy.id, policy);
  }

  return Array.from(merged.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function buildSnapshot(input: {
  agent: AgentRecord;
  executions: AgentExecutionRecord[];
  manifest: AgentManifest;
}): InstalledAgentSnapshot {
  const config = parseAgentConfig(input.agent.config);
  const executions = input.executions.map((execution) => ({
    durationMs: extractDurationMs({
      completedAt: execution.completedAt,
      startedAt: execution.startedAt
    }),
    id: execution.id,
    mode: extractExecutionMode(execution),
    startedAt: execution.startedAt.toISOString(),
    status: mapExecutionStatus(execution.status)
  }));
  const failedExecutions = executions.filter((execution) => execution.status === "FAILED").length;
  const latestExecution = input.executions[0] ?? null;

  return {
    catalogAgentId: input.manifest.agent.id,
    connectors: config.connectors,
    executionCount: executions.length,
    executions,
    failRate: executions.length > 0 ? failedExecutions / executions.length : 0,
    id: input.agent.id,
    keywords: input.manifest.keywords,
    lastRun: latestExecution ? latestExecution.startedAt.toISOString() : null,
    logs: latestExecution ? extractLogs(latestExecution.metadata).slice(0, 12) : [],
    manifest: input.manifest,
    name: input.agent.name,
    runtimeProvider: config.runtimeProvider,
    sourceStatus: input.agent.status,
    status: config.status,
    tags: flattenTags(input.manifest),
    version: config.installedVersion
  };
}

async function resolveOrganization(tenantReference: string) {
  const tenantId = tenantReference.trim();

  if (!tenantId) {
    throw new ProblemDetailsError({
      detail: "Authenticated tenant context is required for installed-agent operations.",
      status: 401,
      title: "Unauthorized"
    });
  }

  try {
    const organization = await prisma.organization.findFirst({
      where: {
        OR: [{ id: tenantId }, { slug: tenantId }, { tenantId }]
      }
    });

    if (!organization) {
      throw new ProblemDetailsError({
        detail: `Tenant ${tenantId} was not found.`,
        status: 404,
        title: "Tenant Not Found"
      });
    }

    return organization;
  } catch (error) {
    if (canFallbackDatabase(error)) {
      throw new ProblemDetailsError({
        detail: "Database is unavailable for installed-agent operations.",
        status: 503,
        title: "Service Unavailable"
      });
    }

    throw error;
  }
}

async function resolveInstalledAgent(input: {
  installedAgentId: string;
  tenantReference: string;
}) {
  const organization = await resolveOrganization(input.tenantReference);
  const agent = await prisma.agent.findFirst({
    where: {
      id: input.installedAgentId,
      tenantId: organization.tenantId
    }
  });

  if (!agent) {
    throw new ProblemDetailsError({
      detail: `Installed agent ${input.installedAgentId} was not found for tenant ${organization.tenantId}.`,
      status: 404,
      title: "Installed Agent Not Found"
    });
  }

  const config = parseAgentConfig(agent.config);

  if (!config.sourceAgentId) {
    throw new ProblemDetailsError({
      detail: `Installed agent ${input.installedAgentId} does not declare a sourceAgentId.`,
      status: 409,
      title: "Installed Agent Misconfigured"
    });
  }

  const catalogEntry = await marketplaceService.getAgentById(config.sourceAgentId);

  if (!catalogEntry) {
    throw new ProblemDetailsError({
      detail: `Catalog agent ${config.sourceAgentId} was not found for installed agent ${input.installedAgentId}.`,
      status: 404,
      title: "Catalog Agent Not Found"
    });
  }

  return {
    agent,
    config,
    manifest: catalogEntry.manifest,
    organization
  };
}

async function findReusableRunningExecution(input: {
  agentId: string;
  payloadHash: string;
  tenantId: string;
}): Promise<AgentExecutionRecord | null> {
  const execution = await prisma.agentExecution.findFirst({
    orderBy: {
      startedAt: "desc"
    },
    where: {
      agentId: input.agentId,
      startedAt: {
        gte: new Date(Date.now() - 10 * 60 * 1000)
      },
      status: "RUNNING",
      tenantId: input.tenantId
    }
  });

  if (!execution) {
    return null;
  }

  return extractPayloadHash(execution.metadata) === input.payloadHash ? execution : null;
}

export class InstalledAgentsService {
  async listInstalledAgents(tenantReference: string): Promise<InstalledAgentSnapshot[]> {
    if (!process.env.DATABASE_URL) {
      return [];
    }

    const organization = await resolveOrganization(tenantReference);
    const agents = await prisma.agent.findMany({
      orderBy: {
        updatedAt: "desc"
      },
      where: {
        tenantId: organization.tenantId
      }
    });

    const snapshots = await Promise.all(
      agents.map(async (agent) => {
        const config = parseAgentConfig(agent.config);

        if (!config.sourceAgentId) {
          return null;
        }

        const catalogEntry = await marketplaceService.getAgentById(config.sourceAgentId);

        if (!catalogEntry) {
          return null;
        }

        const executions = await prisma.agentExecution.findMany({
          orderBy: {
            startedAt: "desc"
          },
          take: 10,
          where: {
            agentId: agent.id,
            tenantId: organization.tenantId
          }
        });

        return buildSnapshot({
          agent,
          executions,
          manifest: catalogEntry.manifest
        });
      })
    );

    return snapshots.filter((snapshot): snapshot is InstalledAgentSnapshot => snapshot !== null);
  }

  async getInstalledAgent(input: {
    installedAgentId: string;
    tenantReference: string;
  }): Promise<InstalledAgentSnapshot> {
    const resolved = await resolveInstalledAgent(input);
    const executions = await prisma.agentExecution.findMany({
      orderBy: {
        startedAt: "desc"
      },
      take: 25,
      where: {
        agentId: resolved.agent.id,
        tenantId: resolved.organization.tenantId
      }
    });

    return buildSnapshot({
      agent: resolved.agent,
      executions,
      manifest: resolved.manifest
    });
  }

  async listInstalledAgentPolicies(input: {
    installedAgentId: string;
    tenantReference: string;
  }): Promise<{
    managedPolicies: ManagedAgentPolicy[];
    manifestPolicies: AgentManifest["policies"];
    runtimeProvider: "manifest-runtime" | "python-orchestrator";
  }> {
    const resolved = await resolveInstalledAgent(input);

    return {
      managedPolicies: resolved.config.managedPolicies,
      manifestPolicies: resolved.manifest.policies,
      runtimeProvider: resolved.config.runtimeProvider
    };
  }

  async upsertInstalledAgentPolicy(input: {
    actions: string[];
    effect: "allow" | "deny";
    enabled?: boolean;
    installedAgentId: string;
    name: string;
    policyId?: string;
    reason?: string;
    tenantReference: string;
    userId: string;
  }): Promise<ManagedAgentPolicy> {
    const resolved = await resolveInstalledAgent({
      installedAgentId: input.installedAgentId,
      tenantReference: input.tenantReference
    });
    const nextPolicy: ManagedAgentPolicy = {
      actions: input.actions,
      effect: input.effect,
      enabled: input.enabled ?? true,
      id: input.policyId ?? `${resolved.agent.id}.policy.${randomUUID()}`,
      name: input.name,
      ...(input.reason ? { reason: input.reason } : {})
    };
    const config = normalizeConfigObject(resolved.agent.config);
    const managedPolicies = mergeManagedPolicies(resolved.config.managedPolicies, nextPolicy);

    await prisma.$transaction(async (tx) => {
      await tx.agent.update({
        data: {
          config: toPrismaJsonValue({
            ...config,
            managedPolicies
          })
        },
        where: {
          id: resolved.agent.id
        }
      });

      await tx.auditLog.create({
        data: {
          action: "AGENT_POLICY_UPSERTED",
          actorId: input.userId,
          diff: toPrismaJsonValue({
            installedAgentId: resolved.agent.id,
            policy: nextPolicy
          }),
          entityId: nextPolicy.id,
          entityType: "agent_policy",
          tenantId: resolved.organization.tenantId
        }
      });
    });

    return nextPolicy;
  }

  async patchInstalledAgentPolicy(input: {
    actions?: string[];
    effect?: "allow" | "deny";
    enabled?: boolean;
    installedAgentId: string;
    name?: string;
    policyId: string;
    reason?: string;
    tenantReference: string;
    userId: string;
  }): Promise<ManagedAgentPolicy> {
    const resolved = await resolveInstalledAgent({
      installedAgentId: input.installedAgentId,
      tenantReference: input.tenantReference
    });
    const currentPolicy = resolved.config.managedPolicies.find((policy) => policy.id === input.policyId);

    if (!currentPolicy) {
      throw new ProblemDetailsError({
        detail: `Managed policy ${input.policyId} was not found for installed agent ${resolved.agent.id}.`,
        status: 404,
        title: "Policy Not Found"
      });
    }

    const nextPolicy: ManagedAgentPolicy = {
      actions: input.actions ?? currentPolicy.actions,
      effect: input.effect ?? currentPolicy.effect,
      enabled: input.enabled ?? currentPolicy.enabled ?? true,
      id: currentPolicy.id,
      name: input.name ?? currentPolicy.name,
      ...(input.reason ?? currentPolicy.reason
        ? { reason: input.reason ?? currentPolicy.reason }
        : {})
    };
    const managedPolicies = resolved.config.managedPolicies.map((policy) =>
      policy.id === currentPolicy.id ? nextPolicy : policy
    );
    const config = normalizeConfigObject(resolved.agent.config);

    await prisma.$transaction(async (tx) => {
      await tx.agent.update({
        data: {
          config: toPrismaJsonValue({
            ...config,
            managedPolicies
          })
        },
        where: {
          id: resolved.agent.id
        }
      });

      await tx.auditLog.create({
        data: {
          action: "AGENT_POLICY_UPDATED",
          actorId: input.userId,
          diff: toPrismaJsonValue({
            installedAgentId: resolved.agent.id,
            policy: nextPolicy
          }),
          entityId: nextPolicy.id,
          entityType: "agent_policy",
          tenantId: resolved.organization.tenantId
        }
      });
    });

    return nextPolicy;
  }

  async applyPolicyTemplate(input: {
    installedAgentId: string;
    replaceExisting?: boolean;
    template: "admin" | "readonly" | "standard";
    tenantReference: string;
    userId: string;
  }): Promise<ManagedAgentPolicy[]> {
    const resolved = await resolveInstalledAgent({
      installedAgentId: input.installedAgentId,
      tenantReference: input.tenantReference
    });
    const templatedPolicies = createPolicyTemplate(
      input.template,
      resolved.organization.tenantId,
      resolved.agent.id
    ).map((policy, index) => ({
      actions: [policy.action],
      effect: policy.effect,
      enabled: true,
      id: policy.id,
      name: `${input.template} template ${index + 1}`,
      ...(policy.reason ? { reason: policy.reason } : {})
    } satisfies ManagedAgentPolicy));
    const config = normalizeConfigObject(resolved.agent.config);
    const managedPolicies = input.replaceExisting
      ? templatedPolicies
      : Array.from(
          new Map(
            [...resolved.config.managedPolicies, ...templatedPolicies].map((policy) => [policy.id, policy])
          ).values()
        );

    await prisma.$transaction(async (tx) => {
      await tx.agent.update({
        data: {
          config: toPrismaJsonValue({
            ...config,
            managedPolicies
          })
        },
        where: {
          id: resolved.agent.id
        }
      });

      await tx.auditLog.create({
        data: {
          action: "AGENT_POLICY_TEMPLATE_APPLIED",
          actorId: input.userId,
          diff: toPrismaJsonValue({
            installedAgentId: resolved.agent.id,
            managedPolicies,
            replaceExisting: input.replaceExisting ?? false,
            template: input.template
          }),
          entityId: resolved.agent.id,
          entityType: "agent_policy_template",
          tenantId: resolved.organization.tenantId
        }
      });
    });

    return managedPolicies;
  }

  async getExecutionReplay(input: {
    executionId: string;
    installedAgentId: string;
    tenantReference: string;
  }): Promise<{
    executionId: string;
    logs: string[];
    output: Record<string, unknown> | null;
    status: string;
  }> {
    const resolved = await resolveInstalledAgent({
      installedAgentId: input.installedAgentId,
      tenantReference: input.tenantReference
    });
    const execution = await prisma.agentExecution.findFirst({
      where: {
        agentId: resolved.agent.id,
        id: input.executionId,
        tenantId: resolved.organization.tenantId
      }
    });

    if (!execution) {
      throw new ProblemDetailsError({
        detail: `Execution ${input.executionId} was not found for installed agent ${input.installedAgentId}.`,
        status: 404,
        title: "Execution Not Found"
      });
    }

    return {
      executionId: execution.id,
      logs: extractLogs(execution.metadata),
      output:
        execution.output && typeof execution.output === "object"
          ? (execution.output as Record<string, unknown>)
          : null,
      status: execution.status
    };
  }

  async runInstalledAgent(input: {
    installedAgentId: string;
    payload: Record<string, unknown>;
    tenantReference: string;
    userId: string;
  }): Promise<{
    catalogAgentId: string;
    executionId: string;
    mode: "LIVE";
    reused: boolean;
  }> {
    const resolved = await resolveInstalledAgent({
      installedAgentId: input.installedAgentId,
      tenantReference: input.tenantReference
    });
    const payloadHash = buildPayloadHash(input.payload);
    const reusableExecution = await findReusableRunningExecution({
      agentId: resolved.agent.id,
      payloadHash,
      tenantId: resolved.organization.tenantId
    });

    if (reusableExecution) {
      await prisma.auditLog.create({
        data: {
          action: "AGENT_LIVE_EXECUTION_REUSED",
          actorId: input.userId,
          diff: toPrismaJsonValue({
            executionId: reusableExecution.id,
            installedAgentId: resolved.agent.id,
            payloadHash
          }),
          entityId: reusableExecution.id,
          entityType: "agent_execution",
          tenantId: resolved.organization.tenantId
        }
      });

      return {
        catalogAgentId: resolved.manifest.agent.id,
        executionId: reusableExecution.id,
        mode: "LIVE",
        reused: true
      };
    }

    const executionId = randomUUID();
    const startedAt = new Date();
    const initialLogs = [
      `Resolved installed agent ${resolved.agent.id} from catalog ${resolved.manifest.agent.id}.`,
      `Queued live execution for runtime provider ${resolved.config.runtimeProvider}.`
    ];

    await prisma.$transaction(async (tx) => {
      await tx.agentExecution.upsert({
        create: {
          agentId: resolved.agent.id,
          id: executionId,
          input: toPrismaJsonValue(input.payload),
          metadata: toPrismaJsonValue({
            catalogAgentId: resolved.manifest.agent.id,
            logs: initialLogs,
            payloadHash,
            runtimeProvider: resolved.config.runtimeProvider
          }),
          organizationId: resolved.organization.id,
          source: "MANUAL",
          startedAt,
          status: "RUNNING",
          tenantId: resolved.organization.tenantId,
          userId: input.userId
        },
        update: {
          agentId: resolved.agent.id,
          input: toPrismaJsonValue(input.payload),
          metadata: toPrismaJsonValue({
            catalogAgentId: resolved.manifest.agent.id,
            logs: initialLogs,
            payloadHash,
            runtimeProvider: resolved.config.runtimeProvider
          }),
          organizationId: resolved.organization.id,
          source: "MANUAL",
          startedAt,
          status: "RUNNING",
          tenantId: resolved.organization.tenantId,
          userId: input.userId
        },
        where: {
          id: executionId
        }
      });

      await tx.auditLog.create({
        data: {
          action: "AGENT_LIVE_EXECUTION_QUEUED",
          actorId: input.userId,
          diff: toPrismaJsonValue({
            catalogAgentId: resolved.manifest.agent.id,
            executionId,
            installedAgentId: resolved.agent.id,
            mode: "LIVE",
            payloadHash,
            runtimeProvider: resolved.config.runtimeProvider
          }),
          entityId: executionId,
          entityType: "agent_execution",
          tenantId: resolved.organization.tenantId
        }
      });
    });

    try {
      const queued = await enqueueInstalledAgentExecution(getApiConfig(), {
        agentId: resolved.agent.id,
        catalogAgentId: resolved.manifest.agent.id,
        executionId,
        input: input.payload,
        organizationId: resolved.organization.id,
        tenantId: resolved.organization.tenantId,
        userId: input.userId
      });

      await prisma.agentExecution.update({
        data: {
          metadata: toPrismaJsonValue({
            catalogAgentId: resolved.manifest.agent.id,
            logs: [
              ...initialLogs,
              `Job ${queued.jobId} aceito pela fila com backlog pendente ${queued.pendingJobs}.`
            ],
            payloadHash,
            queueJobId: queued.jobId,
            queuePendingJobs: queued.pendingJobs,
            runtimeProvider: resolved.config.runtimeProvider
          })
        },
        where: {
          id: executionId
        }
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to enqueue installed-agent execution.";

      await prisma.$transaction(async (tx) => {
        await tx.agentExecution.update({
          data: {
            completedAt: new Date(),
            errorMessage,
            metadata: toPrismaJsonValue({
              catalogAgentId: resolved.manifest.agent.id,
              logs: [...initialLogs, `Falha ao enfileirar execucao live: ${errorMessage}`],
              payloadHash,
              runtimeProvider: resolved.config.runtimeProvider
            }),
            status: "FAILED"
          },
          where: {
            id: executionId
          }
        });

        await tx.auditLog.create({
          data: {
            action: "AGENT_LIVE_EXECUTION_QUEUE_FAILED",
            actorId: input.userId,
            diff: toPrismaJsonValue({
              errorMessage,
              executionId,
              installedAgentId: resolved.agent.id,
              payloadHash
            }),
            entityId: executionId,
            entityType: "agent_execution",
            tenantId: resolved.organization.tenantId
          }
        });
      });

      if (error instanceof QueueBackpressureError) {
        throw new ProblemDetailsError({
          detail: error.message,
          status: 503,
          title: "Queue Backpressure"
        });
      }

      if (error instanceof TenantQueueRateLimitError) {
        throw new ProblemDetailsError({
          detail: error.message,
          status: 429,
          title: "Rate Limit Exceeded"
        });
      }

      throw new ProblemDetailsError({
        detail: errorMessage,
        status: 503,
        title: "Queue Unavailable"
      });
    }

    return {
      catalogAgentId: resolved.manifest.agent.id,
      executionId,
      mode: "LIVE",
      reused: false
    };
  }
}

export const installedAgentsService = new InstalledAgentsService();
