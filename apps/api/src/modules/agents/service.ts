import { randomUUID } from "node:crypto";

import {
  AgentMemoryService,
  computeOutputHash,
  type AgentLearningRecord,
  type AgentManifest,
  runAgentDryRun
} from "@birthub/agents-core";
import { prisma } from "@birthub/database";

import { toPrismaJsonValue } from "../../lib/prisma-json.js";
import { decryptConnectorsMap } from "../../lib/encryption.js";
import { ProblemDetailsError } from "../../lib/problem-details.js";
import { marketplaceService } from "../marketplace/marketplace-service.js";

type AgentConfigSnapshot = {
  connectors: Record<string, unknown>;
  installedAt: string | null;
  installedVersion: string;
  latestAvailableVersion: string;
  packId: string | null;
  sourceAgentId: string | null;
  status: string;
};

type InstalledAgentExecutionRow = {
  durationMs: number;
  id: string;
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
  sourceStatus: string;
  status: string;
  tags: string[];
  version: string;
}

const MINIMUM_APPROVED_LEARNING_CONFIDENCE = 0.7;
const SHARED_LEARNING_LIMIT = 8;
const FALLBACK_TENANT_ID = "birthhub-alpha";
const sharedLearningMemory = new AgentMemoryService();

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

function parseAgentConfig(config: unknown): AgentConfigSnapshot {
  if (!config || typeof config !== "object") {
    return {
      connectors: {},
      installedAt: null,
      installedVersion: "1.0.0",
      latestAvailableVersion: "1.0.0",
      packId: null,
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
    packId: typeof candidate.packId === "string" ? candidate.packId : null,
    sourceAgentId: typeof candidate.sourceAgentId === "string" ? candidate.sourceAgentId : null,
    status: typeof candidate.status === "string" ? candidate.status : "installed"
  };
}

function toLearningRecord(value: unknown): AgentLearningRecord | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (
    typeof candidate.id !== "string" ||
    typeof candidate.tenantId !== "string" ||
    typeof candidate.sourceAgentId !== "string" ||
    typeof candidate.lessonType !== "string" ||
    typeof candidate.summary !== "string" ||
    !Array.isArray(candidate.evidence) ||
    typeof candidate.confidence !== "number" ||
    !Array.isArray(candidate.keywords) ||
    !Array.isArray(candidate.appliesTo) ||
    typeof candidate.approved !== "boolean" ||
    typeof candidate.createdAt !== "string"
  ) {
    return null;
  }

  return {
    approved: candidate.approved,
    appliesTo: candidate.appliesTo.filter((item): item is string => typeof item === "string"),
    confidence: candidate.confidence,
    createdAt: candidate.createdAt,
    evidence: candidate.evidence.filter((item): item is string => typeof item === "string"),
    id: candidate.id,
    keywords: candidate.keywords.filter((item): item is string => typeof item === "string"),
    lessonType: candidate.lessonType as AgentLearningRecord["lessonType"],
    sourceAgentId: candidate.sourceAgentId,
    summary: candidate.summary,
    tenantId: candidate.tenantId
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
    summary: `${input.manifest.agent.name} executou um dry-run governado com saida estruturada e publicou um aprendizado reutilizavel.`,
    tenantId: input.tenantId
  };
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
    sourceStatus: input.agent.status,
    status: config.status,
    tags: flattenTags(input.manifest),
    version: config.installedVersion
  };
}

async function resolveOrganization(tenantReference: string) {
  const tenantId = tenantReference.trim() || FALLBACK_TENANT_ID;

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

  async getExecutionReplay(input: {
    executionId: string;
    installedAgentId: string;
    tenantReference: string;
  }): Promise<{ executionId: string; logs: string[] }> {
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
      logs: extractLogs(execution.metadata)
    };
  }

  async runInstalledAgent(input: {
    installedAgentId: string;
    payload: Record<string, unknown>;
    tenantReference: string;
    userId?: string | null;
  }): Promise<{
    catalogAgentId: string;
    executionId: string;
    learningRecordId: string;
    logs: string[];
    output: Record<string, unknown>;
  }> {
    const resolved = await resolveInstalledAgent({
      installedAgentId: input.installedAgentId,
      tenantReference: input.tenantReference
    });
    const sharedLearning = await this.querySharedLearning({
      keywords: resolved.manifest.keywords,
      tenantId: resolved.organization.tenantId
    });
    const startedAt = new Date();
    const dryRun = await runAgentDryRun(resolved.manifest);
    const learningRecord = buildLearningRecord({
      agentId: resolved.agent.id,
      manifest: resolved.manifest,
      outputPreview: dryRun.output.slice(0, 400),
      tenantId: resolved.organization.tenantId
    });
    const logs = [
      `Resolved installed agent ${resolved.agent.id} from catalog ${resolved.manifest.agent.id}.`,
      `Loaded ${sharedLearning.length} approved shared learnings for this execution.`,
      ...dryRun.logs,
      `Published governed shared learning record ${learningRecord.id}.`
    ];
    const completedAt = new Date();
    const output = {
      catalogAgentId: resolved.manifest.agent.id,
      executionMode: "DRY_RUN",
      input: input.payload,
      result: JSON.parse(dryRun.output) as Record<string, unknown>,
      sharedLearningUsed: sharedLearning.map((record) => ({
        confidence: record.confidence,
        id: record.id,
        sourceAgentId: record.sourceAgentId,
        summary: record.summary
      }))
    };
    const outputHash = computeOutputHash(JSON.stringify(output));
    const executionId = randomUUID();

    await prisma.$transaction(async (tx) => {
      await tx.agentExecution.create({
        data: {
          agentId: resolved.agent.id,
          completedAt,
          id: executionId,
          input: toPrismaJsonValue(input.payload),
          metadata: toPrismaJsonValue({
            catalogAgentId: resolved.manifest.agent.id,
            learningRecordId: learningRecord.id,
            logs
          }),
          organizationId: resolved.organization.id,
          output: toPrismaJsonValue(output),
          outputHash,
          source: "MANUAL",
          startedAt,
          status: "SUCCESS",
          tenantId: resolved.organization.tenantId,
          userId: input.userId ?? null
        }
      });

      await tx.auditLog.create({
        data: {
          action: "AGENT_DRY_RUN_EXECUTED",
          actorId: input.userId ?? null,
          diff: toPrismaJsonValue({
            catalogAgentId: resolved.manifest.agent.id,
            executionId,
            installedAgentId: resolved.agent.id,
            mode: "DRY_RUN"
          }),
          entityId: executionId,
          entityType: "agent_execution",
          tenantId: resolved.organization.tenantId
        }
      });

      await tx.auditLog.create({
        data: {
          action: "AGENT_LEARNING_PUBLISHED",
          actorId: input.userId ?? null,
          diff: toPrismaJsonValue(learningRecord),
          entityId: learningRecord.id,
          entityType: "agent_learning",
          tenantId: resolved.organization.tenantId
        }
      });
    });

    await sharedLearningMemory.publishSharedLearning(resolved.organization.tenantId, learningRecord);

    return {
      catalogAgentId: resolved.manifest.agent.id,
      executionId,
      learningRecordId: learningRecord.id,
      logs,
      output
    };
  }

  private async querySharedLearning(input: {
    keywords: string[];
    tenantId: string;
  }): Promise<AgentLearningRecord[]> {
    const memoryRecords = await sharedLearningMemory.querySharedLearning(input.tenantId, {
      approvedOnly: true,
      keywords: input.keywords,
      minimumConfidence: MINIMUM_APPROVED_LEARNING_CONFIDENCE
    });

    if (!process.env.DATABASE_URL) {
      return memoryRecords.slice(0, SHARED_LEARNING_LIMIT);
    }

    let auditRecords: AgentLearningRecord[] = [];

    try {
      const auditLogs = await prisma.auditLog.findMany({
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

      auditRecords = auditLogs
        .map((log) => toLearningRecord(log.diff))
        .filter((record): record is AgentLearningRecord => record !== null)
        .filter(
          (record) =>
            record.approved &&
            record.confidence >= MINIMUM_APPROVED_LEARNING_CONFIDENCE &&
            record.keywords.some((keyword) =>
              input.keywords.some((candidate) => candidate.toLowerCase() === keyword.toLowerCase())
            )
        );
    } catch (error) {
      if (!canFallbackDatabase(error)) {
        throw error;
      }
    }

    const merged = new Map<string, AgentLearningRecord>();

    for (const record of [...memoryRecords, ...auditRecords]) {
      merged.set(record.id, record);
    }

    return Array.from(merged.values())
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, SHARED_LEARNING_LIMIT);
  }
}

export const installedAgentsService = new InstalledAgentsService();
