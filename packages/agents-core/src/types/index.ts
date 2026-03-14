export type JsonPrimitive = boolean | null | number | string;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export interface AgentSkillReference {
  id: string;
  version: string;
  source?: string;
}

export interface AgentToolReference {
  id: string;
  timeoutMs?: number;
  maxCalls?: number;
}

export interface AgentRestrictionPolicy {
  allowDomains: string[];
  allowTools: string[];
  denyTools: string[];
  maxSteps: number;
  maxTokens: number;
}

export interface AgentDefinition {
  id: string;
  name: string;
  description?: string;
  tenantId: string;
  version: string;
  skills: AgentSkillReference[];
  tools: AgentToolReference[];
  restrictions: AgentRestrictionPolicy;
  tags?: string[];
}

export type AgentLearningLessonType =
  | "execution-pattern"
  | "guardrail"
  | "handoff"
  | "objection"
  | "qualification"
  | "risk"
  | "tooling"
  | "workflow";

export interface AgentLearningRecord {
  id: string;
  tenantId: string;
  sourceAgentId: string;
  lessonType: AgentLearningLessonType;
  summary: string;
  evidence: string[];
  confidence: number;
  keywords: string[];
  appliesTo: string[];
  approved: boolean;
  createdAt: string;
}

export interface ToolCall<TInput = unknown> {
  id: string;
  tool: string;
  input: TInput;
}

export interface ExecutionStep<TInput = unknown> {
  attempt: number;
  input: TInput;
  output?: JsonValue;
  startedAt: string;
  finishedAt?: string;
  toolCall: ToolCall<TInput>;
}

export interface ExecutionPlan<TInput = unknown> {
  executionId: string;
  steps: Array<ToolCall<TInput>>;
  summary?: string;
}

export type ExecutionStatus = "BLOCKED" | "COMPLETED" | "FAILED" | "RUNNING" | "WAITING";

export interface Execution<TInput = unknown, TOutput = unknown> {
  executionId: string;
  agentId: string;
  tenantId: string;
  input: TInput;
  output?: TOutput;
  status: ExecutionStatus;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  steps?: ExecutionStep[];
  metadata?: Record<string, JsonValue>;
}
