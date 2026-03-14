import type { AgentLearningRecord } from "../types/index.js";

const DEFAULT_TOKEN_BUDGET = 8_000;

export type ConversationRole = "assistant" | "system" | "tool" | "user";

export interface ConversationMessage {
  role: ConversationRole;
  content: string;
  createdAt: string;
}

export interface ConversationContext {
  sessionId: string;
  messages: ConversationMessage[];
  metadata: Record<string, unknown>;
  updatedAt: string;
}

interface BackendRecord {
  value: string;
  expiresAt?: number;
}

export interface AgentMemoryBackend {
  del(key: string): Promise<number>;
  get(key: string): Promise<string | null>;
  keys(pattern: string): Promise<string[]>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesPattern(candidate: string, pattern: string): boolean {
  const regex = new RegExp(`^${escapeRegex(pattern).replace(/\\\*/g, ".*")}$`);
  return regex.test(candidate);
}

export class InMemoryAgentMemoryBackend implements AgentMemoryBackend {
  private readonly records = new Map<string, BackendRecord>();

  private sweepExpired(now: number = Date.now()): void {
    for (const [key, record] of this.records.entries()) {
      if (record.expiresAt !== undefined && record.expiresAt <= now) {
        this.records.delete(key);
      }
    }
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : undefined;
    this.records.set(key, expiresAt === undefined ? { value } : { expiresAt, value });
  }

  async get(key: string): Promise<string | null> {
    this.sweepExpired();
    return this.records.get(key)?.value ?? null;
  }

  async del(key: string): Promise<number> {
    return this.records.delete(key) ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    this.sweepExpired();
    return Array.from(this.records.keys()).filter((key) => matchesPattern(key, pattern));
  }
}

function buildNamespacedKey(tenantId: string, agentId: string, memoryKey: string): string {
  if (!tenantId.trim() || !agentId.trim() || !memoryKey.trim()) {
    throw new Error("tenantId, agentId and memoryKey are mandatory");
  }

  return `${tenantId}:${agentId}:${memoryKey}`;
}

function buildSharedLearningKey(tenantId: string, memoryKey: string): string {
  if (!tenantId.trim() || !memoryKey.trim()) {
    throw new Error("tenantId and memoryKey are mandatory");
  }

  return `${tenantId}:shared-learning:${memoryKey}`;
}

export function estimateTokenCount(content: string): number {
  return Math.ceil(content.length / 4);
}

export function compressConversationMessages(
  messages: ConversationMessage[],
  tokenBudget: number = DEFAULT_TOKEN_BUDGET,
  tokenEstimator: (content: string) => number = estimateTokenCount
): ConversationMessage[] {
  if (messages.length <= 1) {
    return messages;
  }

  const safeBudget = Math.max(1, tokenBudget);
  const systemMessage = messages.find((message) => message.role === "system");
  const reversibleMessages = messages.filter((message) => message !== systemMessage).slice().reverse();
  const selected: ConversationMessage[] = [];

  let currentBudget = systemMessage ? tokenEstimator(systemMessage.content) : 0;

  for (const message of reversibleMessages) {
    const messageTokens = tokenEstimator(message.content);
    if (currentBudget + messageTokens > safeBudget && selected.length > 0) {
      break;
    }

    selected.push(message);
    currentBudget += messageTokens;
  }

  const ordered = selected.reverse();
  if (systemMessage) {
    return [systemMessage, ...ordered];
  }

  return ordered;
}

export class AgentMemoryService {
  constructor(private readonly backend: AgentMemoryBackend = new InMemoryAgentMemoryBackend()) {}

  async store<TValue>(
    tenantId: string,
    agentId: string,
    memoryKey: string,
    value: TValue,
    ttlSeconds?: number
  ): Promise<string> {
    const namespacedKey = buildNamespacedKey(tenantId, agentId, memoryKey);
    await this.backend.set(namespacedKey, JSON.stringify(value), ttlSeconds);
    return namespacedKey;
  }

  async get<TValue>(tenantId: string, agentId: string, memoryKey: string): Promise<TValue | null> {
    const namespacedKey = buildNamespacedKey(tenantId, agentId, memoryKey);
    const value = await this.backend.get(namespacedKey);
    return value ? (JSON.parse(value) as TValue) : null;
  }

  async delete(tenantId: string, agentId: string, memoryKey: string): Promise<number> {
    const namespacedKey = buildNamespacedKey(tenantId, agentId, memoryKey);
    return this.backend.del(namespacedKey);
  }

  async listByAgent(tenantId: string, agentId: string): Promise<string[]> {
    return this.backend.keys(`${tenantId}:${agentId}:*`);
  }

  async clearByAgent(tenantId: string, agentId: string): Promise<number> {
    const keys = await this.listByAgent(tenantId, agentId);
    const deletedCounts = await Promise.all(keys.map((key) => this.backend.del(key)));
    return deletedCounts.reduce((total, count) => total + count, 0);
  }

  async clearBySession(tenantId: string, agentId: string, sessionId: string): Promise<number> {
    const keys = await this.backend.keys(`${tenantId}:${agentId}:conversation:${sessionId}*`);
    const deletedCounts = await Promise.all(keys.map((key) => this.backend.del(key)));
    return deletedCounts.reduce((total, count) => total + count, 0);
  }

  async clearByTenant(tenantId: string): Promise<number> {
    const keys = await this.backend.keys(`${tenantId}:*`);
    const deletedCounts = await Promise.all(keys.map((key) => this.backend.del(key)));
    return deletedCounts.reduce((total, count) => total + count, 0);
  }

  async publishSharedLearning(
    tenantId: string,
    record: AgentLearningRecord,
    ttlSeconds?: number
  ): Promise<string> {
    const key = buildSharedLearningKey(tenantId, `${record.id}:${record.sourceAgentId}`);
    await this.backend.set(key, JSON.stringify(record), ttlSeconds);
    return key;
  }

  async getSharedLearning(tenantId: string, recordKey: string): Promise<AgentLearningRecord | null> {
    const value = await this.backend.get(buildSharedLearningKey(tenantId, recordKey));
    return value ? (JSON.parse(value) as AgentLearningRecord) : null;
  }

  async listSharedLearning(tenantId: string): Promise<AgentLearningRecord[]> {
    const keys = await this.backend.keys(buildSharedLearningKey(tenantId, "*"));
    const values = await Promise.all(keys.map((key) => this.backend.get(key)));

    return values
      .filter((value): value is string => value !== null)
      .map((value) => JSON.parse(value) as AgentLearningRecord)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  async querySharedLearning(
    tenantId: string,
    input: {
      approvedOnly?: boolean;
      keywords?: string[];
      minimumConfidence?: number;
    } = {}
  ): Promise<AgentLearningRecord[]> {
    const normalizedKeywords = new Set((input.keywords ?? []).map((keyword) => keyword.trim().toLowerCase()));
    const minimumConfidence = input.minimumConfidence ?? 0;
    const records = await this.listSharedLearning(tenantId);

    return records.filter((record) => {
      if ((input.approvedOnly ?? false) && !record.approved) {
        return false;
      }

      if (record.confidence < minimumConfidence) {
        return false;
      }

      if (normalizedKeywords.size === 0) {
        return true;
      }

      return record.keywords.some((keyword) => normalizedKeywords.has(keyword.trim().toLowerCase()));
    });
  }

  async upsertConversationContext(
    tenantId: string,
    agentId: string,
    context: ConversationContext,
    options?: {
      tokenBudget?: number;
      ttlSeconds?: number;
    }
  ): Promise<ConversationContext> {
    const normalizedContext: ConversationContext = {
      ...context,
      messages: compressConversationMessages(context.messages, options?.tokenBudget ?? DEFAULT_TOKEN_BUDGET),
      updatedAt: new Date().toISOString()
    };

    await this.store(
      tenantId,
      agentId,
      `conversation:${context.sessionId}`,
      normalizedContext,
      options?.ttlSeconds
    );

    return normalizedContext;
  }

  async getConversationContext(
    tenantId: string,
    agentId: string,
    sessionId: string
  ): Promise<ConversationContext | null> {
    return this.get<ConversationContext>(tenantId, agentId, `conversation:${sessionId}`);
  }

  async appendConversationMessage(
    tenantId: string,
    agentId: string,
    sessionId: string,
    message: Omit<ConversationMessage, "createdAt"> & { createdAt?: string },
    options?: {
      metadata?: Record<string, unknown>;
      tokenBudget?: number;
      ttlSeconds?: number;
    }
  ): Promise<ConversationContext> {
    const currentContext = (await this.getConversationContext(tenantId, agentId, sessionId)) ?? {
      sessionId,
      messages: [],
      metadata: options?.metadata ?? {},
      updatedAt: new Date().toISOString()
    };

    const nextContext: ConversationContext = {
      ...currentContext,
      metadata: options?.metadata ?? currentContext.metadata,
      messages: [
        ...currentContext.messages,
        {
          content: message.content,
          createdAt: message.createdAt ?? new Date().toISOString(),
          role: message.role
        }
      ],
      updatedAt: new Date().toISOString()
    };

    return this.upsertConversationContext(tenantId, agentId, nextContext, options);
  }
}
