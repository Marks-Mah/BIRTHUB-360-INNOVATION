import { createHash } from "node:crypto";

import { prisma } from "@birthub/database";

export type OutputType = "executive-report" | "technical-log";
export type OutputStatus = "COMPLETED" | "WAITING_APPROVAL";

export interface OutputRecord {
  agentId: string;
  approvedAt: string | null;
  approvedByUserId: string | null;
  content: string;
  createdAt: string;
  createdByUserId: string;
  id: string;
  outputHash: string;
  status: OutputStatus;
  tenantId: string;
  type: OutputType;
}

function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

function mapType(type: string): OutputType {
  return type === "technical-log" ? "technical-log" : "executive-report";
}

function mapStatus(status: string): OutputStatus {
  return status === "WAITING_APPROVAL" ? "WAITING_APPROVAL" : "COMPLETED";
}

function toOutputRecord(record: {
  agentId: string;
  approvedAt: Date | null;
  approvedByUserId: string | null;
  content: string;
  contentHash: string;
  createdAt: Date;
  createdByUserId: string;
  id: string;
  status: string;
  tenantId: string;
  type: string;
}): OutputRecord {
  return {
    agentId: record.agentId,
    approvedAt: record.approvedAt?.toISOString() ?? null,
    approvedByUserId: record.approvedByUserId,
    content: record.content,
    createdAt: record.createdAt.toISOString(),
    createdByUserId: record.createdByUserId,
    id: record.id,
    outputHash: record.contentHash,
    status: mapStatus(record.status),
    tenantId: record.tenantId,
    type: mapType(record.type)
  };
}

export class OutputService {
  async createOutput(input: {
    agentId: string;
    content: string;
    createdByUserId: string;
    organizationId: string;
    requireApproval?: boolean;
    tenantId: string;
    type: OutputType;
  }): Promise<OutputRecord> {
    const outputHash = hashContent(input.content);
    const record = await prisma.outputArtifact.create({
      data: {
        agentId: input.agentId,
        content: input.content,
        contentHash: outputHash,
        createdByUserId: input.createdByUserId,
        organizationId: input.organizationId,
        status: input.requireApproval ? "WAITING_APPROVAL" : "COMPLETED",
        tenantId: input.tenantId,
        type: input.type
      }
    });

    return toOutputRecord(record);
  }

  async listByTenant(tenantId: string, type?: OutputType): Promise<OutputRecord[]> {
    const outputs = await prisma.outputArtifact.findMany({
      orderBy: {
        createdAt: "desc"
      },
      where: {
        ...(type ? { type } : {}),
        tenantId
      }
    });

    return outputs.map((record) => toOutputRecord(record));
  }

  async listByExecution(tenantId: string, executionId: string): Promise<OutputRecord[]> {
    const links = await prisma.auditLog.findMany({
      orderBy: {
        createdAt: "desc"
      },
      where: {
        action: "AGENT_OUTPUT_CREATED",
        entityId: executionId,
        entityType: "agent_execution",
        tenantId
      }
    });
    const outputIds = links
      .map((link) => {
        if (!link.diff || typeof link.diff !== "object") {
          return null;
        }

        const outputId = (link.diff as { outputId?: unknown }).outputId;
        return typeof outputId === "string" ? outputId : null;
      })
      .filter((value): value is string => value !== null);

    if (outputIds.length === 0) {
      return [];
    }

    const outputs = await prisma.outputArtifact.findMany({
      orderBy: {
        createdAt: "desc"
      },
      where: {
        id: {
          in: outputIds
        },
        tenantId
      }
    });

    return outputs.map((record) => toOutputRecord(record));
  }

  async getById(outputId: string, tenantId: string): Promise<OutputRecord | null> {
    const record = await prisma.outputArtifact.findFirst({
      where: {
        id: outputId,
        tenantId
      }
    });

    return record ? toOutputRecord(record) : null;
  }

  async approve(
    outputId: string,
    tenantId: string,
    approvedByUserId: string
  ): Promise<OutputRecord | null> {
    const current = await prisma.outputArtifact.findFirst({
      where: {
        id: outputId,
        tenantId
      }
    });

    if (!current) {
      return null;
    }

    const updated = await prisma.outputArtifact.update({
      data: {
        approvedAt: new Date(),
        approvedByUserId,
        status: "COMPLETED"
      },
      where: {
        id: current.id
      }
    });

    return toOutputRecord(updated);
  }

  async verifyIntegrity(
    outputId: string,
    tenantId: string
  ): Promise<{ expectedHash: string; isValid: boolean; recalculatedHash: string } | null> {
    const record = await prisma.outputArtifact.findFirst({
      where: {
        id: outputId,
        tenantId
      }
    });

    if (!record) {
      return null;
    }

    const recalculatedHash = hashContent(record.content);

    return {
      expectedHash: record.contentHash,
      isValid: recalculatedHash === record.contentHash,
      recalculatedHash
    };
  }

  async prune(): Promise<number> {
    const technicalCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const reportCutoff = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const [technicalLogs, executiveReports] = await Promise.all([
      prisma.outputArtifact.deleteMany({
        where: {
          createdAt: {
            lt: technicalCutoff
          },
          type: "technical-log"
        }
      }),
      prisma.outputArtifact.deleteMany({
        where: {
          createdAt: {
            lt: reportCutoff
          },
          type: "executive-report"
        }
      })
    ]);

    return technicalLogs.count + executiveReports.count;
  }
}

export const outputService = new OutputService();
