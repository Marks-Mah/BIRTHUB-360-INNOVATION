import { createHash, randomUUID } from "node:crypto";

export type OutputType = "executive-report" | "technical-log";
export type OutputStatus = "COMPLETED" | "WAITING_APPROVAL";

export interface OutputRecord {
  agentId: string;
  content: string;
  createdAt: string;
  id: string;
  outputHash: string;
  status: OutputStatus;
  tenantId: string;
  type: OutputType;
}

function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export class OutputService {
  private readonly outputs = new Map<string, OutputRecord>();

  createOutput(input: {
    agentId: string;
    content: string;
    requireApproval?: boolean;
    tenantId: string;
    type: OutputType;
  }): OutputRecord {
    const outputHash = hashContent(input.content);
    const record: OutputRecord = {
      agentId: input.agentId,
      content: input.content,
      createdAt: new Date().toISOString(),
      id: randomUUID(),
      outputHash,
      status: input.requireApproval ? "WAITING_APPROVAL" : "COMPLETED",
      tenantId: input.tenantId,
      type: input.type
    };

    this.outputs.set(record.id, record);
    return record;
  }

  listByTenant(tenantId: string, type?: OutputType): OutputRecord[] {
    return [...this.outputs.values()]
      .filter((record) => record.tenantId === tenantId)
      .filter((record) => (type ? record.type === type : true))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  getById(outputId: string): OutputRecord | null {
    return this.outputs.get(outputId) ?? null;
  }

  approve(outputId: string): OutputRecord | null {
    const current = this.outputs.get(outputId);

    if (!current) {
      return null;
    }

    const updated: OutputRecord = {
      ...current,
      status: "COMPLETED"
    };

    this.outputs.set(outputId, updated);
    return updated;
  }

  verifyIntegrity(outputId: string): { expectedHash: string; isValid: boolean; recalculatedHash: string } | null {
    const record = this.outputs.get(outputId);

    if (!record) {
      return null;
    }

    const recalculatedHash = hashContent(record.content);

    return {
      expectedHash: record.outputHash,
      isValid: recalculatedHash === record.outputHash,
      recalculatedHash
    };
  }

  prune(): number {
    const now = Date.now();
    let deleted = 0;

    for (const [id, record] of this.outputs.entries()) {
      const ageMs = now - new Date(record.createdAt).getTime();

      if (record.type === "technical-log" && ageMs > 30 * 24 * 60 * 60 * 1000) {
        this.outputs.delete(id);
        deleted += 1;
        continue;
      }

      if (record.type === "executive-report" && ageMs > 365 * 24 * 60 * 60 * 1000) {
        this.outputs.delete(id);
        deleted += 1;
      }
    }

    return deleted;
  }
}

export const outputService = new OutputService();
