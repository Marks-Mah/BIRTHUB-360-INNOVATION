import { existsSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import {
  AgentMemoryService,
  buildAgentRuntimeOutput,
  buildAgentRuntimePlan,
  buildRuntimePolicyRules,
  computeOutputHash,
  findManifestCatalogEntryByAgentId,
  loadManifestCatalog,
  type AgentLearningRecord,
  type AgentManifest,
  type AgentMemoryBackend,
  type ManifestCatalogEntry,
  type ManagedAgentPolicy
} from "@birthub/agents-core";
import { PolicyEngine } from "@birthub/agents-core/policy/engine";
import { BaseTool, DbReadTool, DbWriteTool, HttpTool, SendEmailTool } from "@birthub/agents-core/tools";
import { getWorkerConfig } from "@birthub/config";
import { Prisma, prisma } from "@birthub/database";
import { createLogger } from "@birthub/logger";
import { z } from "zod";
import type { Redis } from "ioredis";

import { PlanExecutor } from "../executors/planExecutor.js";
import {
  createConversationMessage,
  ensureConversationThread
} from "./conversations.js";

const logger = createLogger("agent-runtime");
const DEFAULT_AGENT_BUDGET_LIMIT_BRL = 100;
const MINIMUM_APPROVED_LEARNING_CONFIDENCE = 0.7;
const SHARED_LEARNING_LIMIT = 8;

interface AgentConfigSnapshot {
  managedPolicies: ManagedAgentPolicy[];
  runtimeProvider: "manifest-runtime" | "python-orchestrator";
  sourceAgentId: string | null;
}

interface RuntimeAgentResolution {
  installedAgentId: string | null;
  manifest: AgentManifest;
  organizationId: string | null;
  runtimeAgentId: string;
}

interface RuntimeExecutionInput {
  agentId: string;
  catalogAgentId?: string | null;
  contextSummary?: string;
  executionId: string;
  input: Record<string, unknown>;
  organizationId?: string | null;
  redis: Redis;
  source: "MANUAL" | "WORKFLOW";
  tenantId: string;
  userId?: string | null;
}

interface RuntimeExecutionResult {
  learningRecord: AgentLearningRecord;
  logs: string[];
  metadata: Record<string, unknown>;
  output: Record<string, unknown>;
  outputArtifactId: string;
  outputHash: string;
  status: "SUCCESS" | "WAITING_APPROVAL";
  toolCost: number;
}

interface AuditMemoryPayload {
  expiresAt?: number;
  value?: string;
}

function resolveCatalogRoot(): string {
  const candidates = [
    path.join(process.cwd(), "packages", "agent-packs"),
    path.join(process.cwd(), "..", "..", "packages", "agent-packs"),
    path.join(process.cwd(), "..", "packages", "agent-packs")
  ];

  const found = candidates.find((candidate) => existsSync(candidate));

  if (!found) {
    throw new Error("Unable to locate packages/agent-packs directory.");
  }

  return found;
}

let manifestCatalogCache:
  | {
      entries: ManifestCatalogEntry[];
      loadedAt: number;
    }
  | null = null;

async function getManifestCatalog(): Promise<ManifestCatalogEntry[]> {
  const now = Date.now();
  if (manifestCatalogCache && now - manifestCatalogCache.loadedAt < 60_000) {
    return manifestCatalogCache.entries;
  }

  const entries = await loadManifestCatalog(resolveCatalogRoot());
  manifestCatalogCache = {
    entries,
    loadedAt: now
  };

  return entries;
}

function parseAgentConfig(config: unknown): AgentConfigSnapshot {
  if (!config || typeof config !== "object") {
    return {
      managedPolicies: [],
      runtimeProvider: "manifest-runtime",
      sourceAgentId: null
    };
  }

  const candidate = config as Record<string, unknown>;
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
  const runtimeProvider =
    runtime.provider === "python-orchestrator" ? "python-orchestrator" : "manifest-runtime";

  return {
    managedPolicies,
    runtimeProvider,
    sourceAgentId: typeof candidate.sourceAgentId === "string" ? candidate.sourceAgentId : null
  };
}

function matchesPattern(candidate: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^${escaped.replace(/\\\*/g, ".*")}$`).test(candidate);
}

function readAuditMemoryPayload(diff: unknown): AuditMemoryPayload {
  if (!diff || typeof diff !== "object") {
    return {};
  }

  const candidate = diff as Record<string, unknown>;
  return {
    ...(typeof candidate.expiresAt === "number" ? { expiresAt: candidate.expiresAt } : {}),
    ...(typeof candidate.value === "string" ? { value: candidate.value } : {})
  };
}

function readSessionId(input: Record<string, unknown>): string | null {
  if (typeof input.sessionId === "string" && input.sessionId.trim().length > 0) {
    return input.sessionId.trim();
  }

  if (
    typeof input.context === "object" &&
    input.context !== null &&
    typeof (input.context as Record<string, unknown>).sessionId === "string"
  ) {
    const candidate = (input.context as Record<string, unknown>).sessionId as string;
    return candidate.trim().length > 0 ? candidate.trim() : null;
  }

  return null;
}

class PrismaAuditMemoryBackend implements AgentMemoryBackend {
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const tenantId = key.split(":")[0] ?? "unknown";
    const expiresAt = ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : undefined;

    await prisma.auditLog.create({
      data: {
        action: "AGENT_MEMORY_SET",
        diff: {
          ...(expiresAt !== undefined ? { expiresAt } : {}),
          value
        } as Prisma.InputJsonValue,
        entityId: key,
        entityType: "agent_memory",
        tenantId
      }
    });
  }

  async get(key: string): Promise<string | null> {
    const tenantId = key.split(":")[0] ?? "unknown";
    const latest = await prisma.auditLog.findFirst({
      orderBy: {
        createdAt: "desc"
      },
      where: {
        action: {
          in: ["AGENT_MEMORY_DELETE", "AGENT_MEMORY_SET"]
        },
        entityId: key,
        entityType: "agent_memory",
        tenantId
      }
    });

    if (!latest || latest.action === "AGENT_MEMORY_DELETE") {
      return null;
    }

    const payload = readAuditMemoryPayload(latest.diff);
    if (payload.expiresAt !== undefined && payload.expiresAt <= Date.now()) {
      return null;
    }

    return payload.value ?? null;
  }

  async del(key: string): Promise<number> {
    const tenantId = key.split(":")[0] ?? "unknown";
    const before = await this.get(key);

    await prisma.auditLog.create({
      data: {
        action: "AGENT_MEMORY_DELETE",
        diff: {} as Prisma.InputJsonValue,
        entityId: key,
        entityType: "agent_memory",
        tenantId
      }
    });

    return before ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const tenantId = pattern.split(":")[0] ?? "unknown";
    const records = await prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc"
      },
      where: {
        action: {
          in: ["AGENT_MEMORY_DELETE", "AGENT_MEMORY_SET"]
        },
        entityType: "agent_memory",
        tenantId
      }
    });

    const latestByKey = new Map<
      string,
      {
        action: string;
        diff: unknown;
      }
    >();

    for (const record of records) {
      if (!latestByKey.has(record.entityId)) {
        latestByKey.set(record.entityId, {
          action: record.action,
          diff: record.diff
        });
      }
    }

    return Array.from(latestByKey.entries())
      .filter(([key, value]) => {
        if (value.action === "AGENT_MEMORY_DELETE") {
          return false;
        }

        const payload = readAuditMemoryPayload(value.diff);
        if (payload.expiresAt !== undefined && payload.expiresAt <= Date.now()) {
          return false;
        }

        return matchesPattern(key, pattern);
      })
      .map(([key]) => key);
  }
}

const runtimeMemory = new AgentMemoryService(new PrismaAuditMemoryBackend());

function readNumbers(value: unknown): number[] {
  if (typeof value === "number" && Number.isFinite(value)) {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => readNumbers(item));
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => readNumbers(item));
  }

  return [];
}

function readStrings(value: unknown): string[] {
  if (typeof value === "string" && value.trim().length > 0) {
    return [value.trim()];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => readStrings(item));
  }

  if (value && typeof value === "object") {
    return Object.values(value).flatMap((item) => readStrings(item));
  }

  return [];
}

function toJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function createRuntimeError(code: string, message: string): Error & { code: string } {
  const error = new Error(message) as Error & { code: string };
  error.code = code;
  return error;
}

function buildToolCostTable(input: {
  defaultToolCostBrl: number;
  manifest: AgentManifest;
}): Record<string, number> {
  const table: Record<string, number> = {
    "db-read": 0.08,
    "db-write": 0.12,
    http: 0.22,
    "send-email": 0.06
  };

  for (const tool of input.manifest.tools) {
    const timeoutWeight = Math.min(tool.timeoutMs / 60_000, 1) * 0.08;
    table[tool.id] = roundCurrency(input.defaultToolCostBrl + timeoutWeight);
  }

  return table;
}

async function ensureBudgetHeadroom(input: {
  actorId: string;
  agentId: string;
  estimatedCostBrl: number;
  executionId: string;
  organizationId: string;
  tenantId: string;
}): Promise<{
  consumedBrl: number;
  limitBrl: number;
}> {
  const budget = await prisma.agentBudget.upsert({
    create: {
      agentId: input.agentId,
      limitBrl: DEFAULT_AGENT_BUDGET_LIMIT_BRL,
      organizationId: input.organizationId,
      tenantId: input.tenantId
    },
    update: {},
    where: {
      tenantId_agentId: {
        agentId: input.agentId,
        tenantId: input.tenantId
      }
    }
  });

  const projectedConsumption = roundCurrency(budget.consumedBrl + input.estimatedCostBrl);
  if (projectedConsumption <= budget.limitBrl) {
    return {
      consumedBrl: budget.consumedBrl,
      limitBrl: budget.limitBrl
    };
  }

  await prisma.agentBudget.update({
    data: {
      lastAlertLevel: "BLOCK_100"
    },
    where: {
      id: budget.id
    }
  });

  await prisma.agentBudgetEvent.create({
    data: {
      actorId: input.actorId,
      agentId: input.agentId,
      costBrl: input.estimatedCostBrl,
      executionMode: "LIVE",
      kind: "BLOCK_100",
      metadata: toJsonValue({
        consumedBrl: projectedConsumption,
        executionId: input.executionId,
        limitBrl: budget.limitBrl,
        message: `Execution ${input.executionId} blocked before start because the tenant budget would be exceeded.`
      }),
      organizationId: input.organizationId,
      requestId: input.executionId,
      tenantId: input.tenantId
    }
  });

  throw createRuntimeError(
    "AGENT_BUDGET_EXCEEDED",
    `Execution would exceed the configured budget for agent ${input.agentId}.`
  );
}

async function consumeBudget(input: {
  actorId: string;
  agentId: string;
  costBrl: number;
  executionId: string;
  organizationId: string;
  tenantId: string;
}): Promise<{
  consumedBrl: number;
  limitBrl: number;
  lastAlertLevel: string | null;
}> {
  return prisma.$transaction(async (tx) => {
    const budget = await tx.agentBudget.upsert({
      create: {
        agentId: input.agentId,
        limitBrl: DEFAULT_AGENT_BUDGET_LIMIT_BRL,
        organizationId: input.organizationId,
        tenantId: input.tenantId
      },
      update: {},
      where: {
        tenantId_agentId: {
          agentId: input.agentId,
          tenantId: input.tenantId
        }
      }
    });

    const nextConsumedBrl = roundCurrency(budget.consumedBrl + input.costBrl);
    const nextAlertLevel =
      nextConsumedBrl >= budget.limitBrl
        ? "BLOCK_100"
        : nextConsumedBrl >= budget.limitBrl * 0.8
          ? "WARN_80"
          : budget.lastAlertLevel;

    const updatedBudget = await tx.agentBudget.update({
      data: {
        consumedBrl: nextConsumedBrl,
        lastAlertLevel: nextAlertLevel
      },
      where: {
        id: budget.id
      }
    });

    await tx.agentBudgetEvent.create({
      data: {
        actorId: input.actorId,
        agentId: input.agentId,
        costBrl: input.costBrl,
        executionMode: "LIVE",
        kind: "CONSUME",
        metadata: toJsonValue({
          consumedBrl: nextConsumedBrl,
          executionId: input.executionId,
          limitBrl: updatedBudget.limitBrl
        }),
        organizationId: input.organizationId,
        requestId: input.executionId,
        tenantId: input.tenantId
      }
    });

    if (nextAlertLevel === "WARN_80" || nextAlertLevel === "BLOCK_100") {
      await tx.agentBudgetEvent.create({
        data: {
          actorId: input.actorId,
          agentId: input.agentId,
          executionMode: "LIVE",
          kind: nextAlertLevel,
          metadata: toJsonValue({
            consumedBrl: nextConsumedBrl,
            executionId: input.executionId,
            limitBrl: updatedBudget.limitBrl,
            message:
              nextAlertLevel === "WARN_80"
                ? `Agent ${input.agentId} crossed the 80% budget threshold.`
                : `Agent ${input.agentId} reached the configured budget cap.`
          }),
          organizationId: input.organizationId,
          requestId: input.executionId,
          tenantId: input.tenantId
        }
      });
    }

    return {
      consumedBrl: updatedBudget.consumedBrl,
      lastAlertLevel: updatedBudget.lastAlertLevel ?? null,
      limitBrl: updatedBudget.limitBrl
    };
  });
}

class ManifestCapabilityTool extends BaseTool<Record<string, unknown>, Record<string, unknown>> {
  constructor(
    private readonly capability: {
      description: string;
      id: string;
      name: string;
    },
    options?: {
      policyEngine?: PolicyEngine;
      timeoutMs?: number;
    }
  ) {
    super({
      description: capability.description,
      inputSchema: z.object({}).catchall(z.unknown()),
      name: capability.id,
      outputSchema: z.object({}).catchall(z.unknown()),
      ...(options?.timeoutMs ? { timeoutMs: options.timeoutMs } : {})
    }, options?.policyEngine ? { policyEngine: options.policyEngine } : {});
  }

  protected async execute(
    input: Record<string, unknown>,
    context: {
      agentId: string;
      policyContext?: Record<string, unknown>;
      tenantId: string;
      traceId: string;
    }
  ): Promise<Record<string, unknown>> {
    const flattenedNumbers = readNumbers(input.sourcePayload ?? input);
    const flattenedStrings = readStrings(input.sourcePayload ?? input).slice(0, 6);
    const average =
      flattenedNumbers.length > 0
        ? Math.round(
            (flattenedNumbers.reduce((total, value) => total + value, 0) / flattenedNumbers.length) *
              100
          ) / 100
        : 0;

    return {
      agentId: context.agentId,
      capability: this.capability.name,
      capabilityId: this.capability.id,
      confidence: flattenedNumbers.length > 0 ? "medium" : "high",
      evidence: flattenedStrings,
      observedAverage: average,
      summary: `${this.capability.name} executada com ${flattenedNumbers.length} sinal(is) numerico(s) e ${flattenedStrings.length} evidencia(s) textual(is).`,
      tenantId: context.tenantId,
      traceId: context.traceId
    };
  }
}

function createRuntimeTools(
  manifest: AgentManifest,
  policyEngine: PolicyEngine,
  defaultToolCostBrl: number
): {
  costs: Record<string, number>;
  tools: Record<string, BaseTool<unknown, unknown>>;
} {
  const costs = buildToolCostTable({
    defaultToolCostBrl,
    manifest
  });
  const tools: Record<string, BaseTool<unknown, unknown>> = {
    "db-read": new DbReadTool({
      executor: async ({ query, tenantId }) => [
        {
          query,
          source: "agent-runtime",
          tenantId
        }
      ],
      policyEngine
    }) as BaseTool<unknown, unknown>,
    "db-write": new DbWriteTool({
      auditPublisher: async (event) => {
        logger.info({ event }, "agent-runtime db-write audit");
      },
      executor: async () => 1,
      policyEngine
    }) as BaseTool<unknown, unknown>,
    http: new HttpTool({ policyEngine }) as BaseTool<unknown, unknown>,
    "send-email": new SendEmailTool({ policyEngine }) as BaseTool<unknown, unknown>
  };

  for (const tool of manifest.tools) {
    tools[tool.id] = new ManifestCapabilityTool(
      {
        description: tool.description,
        id: tool.id,
        name: tool.name
      },
      {
        policyEngine,
        timeoutMs: tool.timeoutMs
      }
    ) as BaseTool<unknown, unknown>;
  }

  return {
    costs,
    tools
  };
}

function buildLearningRecord(input: {
  agentId: string;
  manifest: AgentManifest;
  outputPreview: string;
  tenantId: string;
}): AgentLearningRecord {
  return {
    approved: true,
    appliesTo: [input.manifest.agent.id],
    confidence: 0.82,
    createdAt: new Date().toISOString(),
    evidence: [input.outputPreview],
    id: randomUUID(),
    keywords: input.manifest.keywords.slice(0, SHARED_LEARNING_LIMIT),
    lessonType: "execution-pattern",
    sourceAgentId: input.agentId,
    summary: `${input.manifest.agent.name} executou um fluxo live governado e publicou aprendizado reutilizavel.`,
    tenantId: input.tenantId
  };
}

async function resolveRuntimeAgent(input: {
  agentId: string;
  catalogAgentId?: string | null;
  tenantId: string;
}): Promise<RuntimeAgentResolution> {
  const catalog = await getManifestCatalog();
  const installedAgent = await prisma.agent.findFirst({
    where: {
      id: input.agentId,
      tenantId: input.tenantId
    }
  });
  const installedConfig = installedAgent ? parseAgentConfig(installedAgent.config) : null;
  const resolvedCatalogAgentId =
    input.catalogAgentId ??
    installedConfig?.sourceAgentId ??
    input.agentId;
  const catalogEntry = findManifestCatalogEntryByAgentId(catalog, resolvedCatalogAgentId);

  if (!catalogEntry) {
    throw new Error(`Catalog manifest '${resolvedCatalogAgentId}' was not found.`);
  }

  return {
    installedAgentId: installedAgent?.id ?? null,
    manifest: catalogEntry.manifest,
    organizationId: installedAgent?.organizationId ?? null,
    runtimeAgentId: installedAgent?.id ?? input.agentId
  };
}

async function resolveManagedPolicies(input: {
  installedAgentId: string | null;
  tenantId: string;
}): Promise<ManagedAgentPolicy[]> {
  if (!input.installedAgentId) {
    return [];
  }

  const agent = await prisma.agent.findFirst({
    where: {
      id: input.installedAgentId,
      tenantId: input.tenantId
    }
  });

  if (!agent) {
    return [];
  }

  return parseAgentConfig(agent.config).managedPolicies;
}

async function querySharedLearning(input: {
  keywords: string[];
  tenantId: string;
}): Promise<AgentLearningRecord[]> {
  const fromMemory = await runtimeMemory.querySharedLearning(input.tenantId, {
    approvedOnly: true,
    keywords: input.keywords,
    minimumConfidence: MINIMUM_APPROVED_LEARNING_CONFIDENCE
  });
  const fromAuditLogs = await prisma.auditLog.findMany({
    orderBy: {
      createdAt: "desc"
    },
    take: 50,
    where: {
      action: "AGENT_LEARNING_PUBLISHED",
      entityType: "agent_learning",
      tenantId: input.tenantId
    }
  });

  const merged = new Map<string, AgentLearningRecord>();
  for (const record of fromMemory) {
    merged.set(record.id, record);
  }

  for (const log of fromAuditLogs) {
    const diff = log.diff as Record<string, unknown>;
    if (
      typeof diff.id === "string" &&
      typeof diff.summary === "string" &&
      typeof diff.confidence === "number" &&
      Array.isArray(diff.keywords) &&
      diff.keywords.some(
        (keyword) =>
          typeof keyword === "string" &&
          input.keywords.some((candidate) => candidate.toLowerCase() === keyword.toLowerCase())
      )
    ) {
      merged.set(diff.id, diff as unknown as AgentLearningRecord);
    }
  }

  return Array.from(merged.values())
    .filter((record) => record.confidence >= MINIMUM_APPROVED_LEARNING_CONFIDENCE)
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, SHARED_LEARNING_LIMIT);
}

async function appendConversationMessage(input: {
  agentId: string;
  content: string;
  correlationId?: string | null;
  organizationId?: string | null;
  role: "assistant" | "user";
  sessionId?: string | null;
  tenantId: string;
}): Promise<void> {
  const sessionId = input.sessionId?.trim();
  if (!sessionId) {
    return;
  }

  await runtimeMemory.appendConversationMessage(
    input.tenantId,
    input.agentId,
    sessionId,
    {
      content: input.content,
      role: input.role
    },
    {
      ttlSeconds: 7 * 24 * 60 * 60
    }
  );

  if (!input.organizationId) {
    return;
  }

  const thread = await ensureConversationThread({
    channel: "agent-runtime",
    correlationId: input.correlationId ?? sessionId,
    externalThreadId: sessionId,
    metadata: {
      agentId: input.agentId,
      sessionId
    },
    organizationId: input.organizationId,
    tenantId: input.tenantId
  });

  await createConversationMessage({
    agentId: input.agentId,
    content: input.content,
    direction: input.role === "user" ? "inbound" : "outbound",
    metadata: {
      sessionId
    },
    organizationId: input.organizationId,
    role: input.role,
    tenantId: input.tenantId,
    threadId: thread.id
  });
}

async function createOutputArtifact(input: {
  content: string;
  executionId: string;
  manifest: AgentManifest;
  organizationId: string;
  requireApproval: boolean;
  tenantId: string;
  type: "executive-report" | "technical-log";
  userId?: string | null;
}): Promise<string> {
  const output = await prisma.outputArtifact.create({
    data: {
      agentId: input.manifest.agent.id,
      content: input.content,
      contentHash: computeOutputHash(input.content),
      createdByUserId: input.userId ?? "system",
      organizationId: input.organizationId,
      status: input.requireApproval ? "WAITING_APPROVAL" : "COMPLETED",
      tenantId: input.tenantId,
      type: input.type
    }
  });

  await prisma.auditLog.create({
    data: {
      action: "AGENT_OUTPUT_CREATED",
      actorId: input.userId ?? null,
      diff: {
        outputId: output.id,
        status: output.status,
        type: output.type
      } as Prisma.InputJsonValue,
      entityId: input.executionId,
      entityType: "agent_execution",
      tenantId: input.tenantId
    }
  });

  return output.id;
}

export async function executeManifestAgentRuntime(
  input: RuntimeExecutionInput
): Promise<RuntimeExecutionResult> {
  const resolved = await resolveRuntimeAgent({
    agentId: input.agentId,
    ...(input.catalogAgentId !== undefined ? { catalogAgentId: input.catalogAgentId } : {}),
    tenantId: input.tenantId
  });
  const organizationId =
    input.organizationId ??
    resolved.organizationId ??
    (
      await prisma.organization.findFirst({
        where: {
          tenantId: input.tenantId
        }
      })
    )?.id ??
    null;

  if (!organizationId) {
    throw new Error(`Organization not found for tenant ${input.tenantId}.`);
  }

  const workerConfig = getWorkerConfig();
  const sharedLearning = await querySharedLearning({
    keywords: resolved.manifest.keywords,
    tenantId: input.tenantId
  });
  const managedPolicies = await resolveManagedPolicies({
    installedAgentId: resolved.installedAgentId,
    tenantId: input.tenantId
  });
  const policyEngine = new PolicyEngine(buildRuntimePolicyRules(resolved.manifest, managedPolicies));
  const plan = buildAgentRuntimePlan({
    input: input.input,
    manifest: resolved.manifest,
    sharedLearning,
    tenantId: input.tenantId,
    ...(input.contextSummary !== undefined ? { contextSummary: input.contextSummary } : {})
  });
  const logs = [...plan.logs];
  const actorId = input.userId ?? "system";
  const { costs: toolCostTable, tools: runtimeTools } = createRuntimeTools(
    resolved.manifest,
    policyEngine,
    workerConfig.AGENT_DEFAULT_TOOL_COST_BRL
  );

  const persistLogs = async (): Promise<void> => {
    await prisma.agentExecution.updateMany({
      data: {
        metadata: {
          logs
        } as Prisma.InputJsonValue
      },
      where: {
        id: input.executionId
      }
    });
  };

  await appendConversationMessage({
    agentId: resolved.runtimeAgentId,
    content: JSON.stringify(input.input),
    correlationId: input.executionId,
    organizationId,
    role: "user",
    sessionId: readSessionId(input.input),
    tenantId: input.tenantId
  }).catch(() => undefined);

  await persistLogs();

  const plannedCostBrl = roundCurrency(
    plan.toolCalls.reduce((total, call) => total + (toolCostTable[call.tool] ?? workerConfig.AGENT_DEFAULT_TOOL_COST_BRL), 0)
  );
  await ensureBudgetHeadroom({
    actorId,
    agentId: resolved.runtimeAgentId,
    estimatedCostBrl: plannedCostBrl,
    executionId: input.executionId,
    organizationId,
    tenantId: input.tenantId
  });
  logs.push(`Budget preflight aprovado para custo estimado de R$ ${plannedCostBrl.toFixed(2)}.`);
  await persistLogs();

  const executor = new PlanExecutor({
    circuitBreaker: {
      cooldownMs: workerConfig.AGENT_CIRCUIT_BREAKER_COOLDOWN_MS,
      failureThreshold: workerConfig.AGENT_CIRCUIT_BREAKER_FAILURES
    },
    executionTimeoutMs: workerConfig.AGENT_EXECUTION_TIMEOUT_MS,
    hooks: {
      onPlanBuilt: async (toolCalls) => {
        logs.push(`Planner confirmou ${toolCalls.length} chamada(s) de ferramenta.`);
        await persistLogs();
      },
      onStepCompleted: async (step, context) => {
        logs.push(
          `Step ${context.index}/${context.total} concluido com ${step.call.tool} (R$ ${step.estimatedCostBrl.toFixed(2)}).`
        );
        await persistLogs();
      }
    },
    maxCostBrl: workerConfig.AGENT_MAX_COST_BRL,
    maxPlanSteps: workerConfig.AGENT_MAX_PLAN_STEPS,
    redis: input.redis,
    retryAttempts: workerConfig.AGENT_TOOL_RETRY_ATTEMPTS,
    toolCostEstimator: ({ call }) =>
      toolCostTable[call.tool] ?? workerConfig.AGENT_DEFAULT_TOOL_COST_BRL,
    tools: runtimeTools
  });
  const execution = await executor.execute({
    agentId: resolved.manifest.agent.id,
    executionId: input.executionId,
    input: input.input,
    tenantId: input.tenantId,
    toolCalls: plan.toolCalls.map((call) => ({
      input: call.input,
      tool: call.tool
    }))
  });
  const output = buildAgentRuntimeOutput({
    input: input.input,
    logs,
    manifest: resolved.manifest,
    plan,
    sharedLearning,
    steps: execution.steps
  });
  const budgetState = await consumeBudget({
    actorId,
    agentId: resolved.runtimeAgentId,
    costBrl: execution.estimatedCostBrlTotal,
    executionId: input.executionId,
    organizationId,
    tenantId: input.tenantId
  });
  const learningRecord = buildLearningRecord({
    agentId: resolved.runtimeAgentId,
    manifest: resolved.manifest,
    outputPreview: JSON.stringify(output).slice(0, 400),
    tenantId: input.tenantId
  });
  const governanceRequireApproval = output.approvals_or_dependencies.length > 0;
  const outputType = governanceRequireApproval ? "executive-report" : "technical-log";
  const outputArtifactId = await createOutputArtifact({
    content: JSON.stringify(output, null, 2),
    executionId: input.executionId,
    manifest: resolved.manifest,
    organizationId,
    requireApproval: governanceRequireApproval,
    tenantId: input.tenantId,
    type: outputType,
    userId: input.userId ?? null
  });

  await prisma.auditLog.create({
    data: {
      action: "AGENT_LEARNING_PUBLISHED",
      actorId: input.userId ?? null,
      diff: learningRecord as unknown as Prisma.InputJsonValue,
      entityId: learningRecord.id,
      entityType: "agent_learning",
      tenantId: input.tenantId
    }
  });
  await runtimeMemory.publishSharedLearning(input.tenantId, learningRecord);
  await appendConversationMessage({
    agentId: resolved.runtimeAgentId,
    content: output.summary,
    correlationId: input.executionId,
    organizationId,
    role: "assistant",
    sessionId: readSessionId(input.input),
    tenantId: input.tenantId
  }).catch(() => undefined);

  logs.push(`Shared learning ${learningRecord.id} publicado.`);
  logs.push(`Output artifact ${outputArtifactId} criado automaticamente.`);
  logs.push(
    `Budget consumido: R$ ${execution.estimatedCostBrlTotal.toFixed(2)} (saldo ${budgetState.consumedBrl.toFixed(2)}/${budgetState.limitBrl.toFixed(2)}).`
  );
  await persistLogs();

  const toolCost = execution.estimatedCostBrlTotal;
  const runtimeStatus = governanceRequireApproval ? "WAITING_APPROVAL" : "SUCCESS";
  const metadata = {
    budgetConsumedBrl: budgetState.consumedBrl,
    budgetLimitBrl: budgetState.limitBrl,
    budgetAlertLevel: budgetState.lastAlertLevel,
    catalogAgentId: resolved.manifest.agent.id,
    executionStatus: runtimeStatus,
    learningRecordId: learningRecord.id,
    logs,
    managedPolicies,
    outputArtifactId,
    runtimeProvider: "manifest-runtime",
    plannedCostBrl,
    steps: execution.steps.length,
    toolCost,
    trace: execution.trace
  };

  return {
    learningRecord,
    logs,
    metadata,
    output: output as unknown as Record<string, unknown>,
    outputArtifactId,
    outputHash: computeOutputHash(JSON.stringify(output)),
    status: runtimeStatus,
    toolCost
  };
}
