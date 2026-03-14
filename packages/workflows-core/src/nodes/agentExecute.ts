import { interpolateValue } from "../interpolation/interpolate.js";
import type { WorkflowRuntimeContext } from "../types.js";

export interface AgentExecuteConfig {
  agentId: string;
  input?: Record<string, unknown>;
  onError?: "continue" | "stop";
}

export interface AgentExecutor {
  execute: (args: {
    agentId: string;
    contextSummary: string;
    input: Record<string, unknown>;
  }) => Promise<unknown>;
}

function summarizeContext(context: WorkflowRuntimeContext): string {
  const stepCount = Object.keys(context.steps).length;
  return `workflow=${context.workflowId}; execution=${context.executionId}; steps=${stepCount}`;
}

export async function executeAgentNode(
  config: AgentExecuteConfig,
  context: WorkflowRuntimeContext,
  executor: AgentExecutor
): Promise<unknown> {
  const interpolated = interpolateValue(config, context);
  return executor.execute({
    agentId: interpolated.agentId,
    contextSummary: summarizeContext(context),
    input: interpolated.input ?? {}
  });
}

