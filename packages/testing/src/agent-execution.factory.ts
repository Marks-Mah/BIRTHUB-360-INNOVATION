export type MockExecutionStatus = "BLOCKED" | "COMPLETED" | "FAILED" | "RUNNING" | "WAITING";

export interface MockAgentExecution {
  executionId: string;
  agentId: string;
  tenantId: string;
  status: MockExecutionStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  startedAt: string;
  finishedAt?: string;
  error?: string;
}

export interface InvalidMockAgentExecution
  extends Omit<MockAgentExecution, "status"> {
  status: "INVALID";
}

interface FactoryOptions {
  status?: MockExecutionStatus;
  executionId?: string;
  agentId?: string;
  tenantId?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
}

export function createMockAgentExecution(options: FactoryOptions = {}): MockAgentExecution {
  const status = options.status ?? "WAITING";
  const base: MockAgentExecution = {
    agentId: options.agentId ?? "agent-test",
    executionId: options.executionId ?? `exec_${Math.random().toString(36).slice(2, 10)}`,
    input: options.input ?? { payload: "sample" },
    startedAt: new Date().toISOString(),
    status,
    tenantId: options.tenantId ?? "tenant-test"
  };

  if (status === "COMPLETED") {
    base.output = options.output ?? { ok: true };
    base.finishedAt = new Date().toISOString();
  }

  if (status === "FAILED") {
    base.error = options.error ?? "Execution failed in mock factory.";
    base.finishedAt = new Date().toISOString();
  }

  if (status === "BLOCKED") {
    base.error = options.error ?? "Policy denied.";
  }

  return base;
}

export function createInvalidMockAgentExecution(): InvalidMockAgentExecution {
  return {
    agentId: "agent-invalid",
    executionId: "exec_invalid",
    input: {},
    startedAt: new Date().toISOString(),
    status: "INVALID",
    tenantId: "tenant-invalid"
  };
}
