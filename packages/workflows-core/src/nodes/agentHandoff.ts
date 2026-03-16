import { interpolateValue } from "../interpolation/interpolate.js";
import type { WorkflowRuntimeContext } from "../types.js";

export interface AgentHandoffConfig {
  context?: Record<string, unknown> | undefined;
  correlationId?: string | undefined;
  sourceAgentId: string;
  summary: string;
  targetAgentId: string;
  threadId?: string | undefined;
}

export interface HandoffExecutor {
  execute: (args: {
    context: Record<string, unknown>;
    contextSummary: string;
    correlationId: string;
    executionId: string;
    sourceAgentId: string;
    summary: string;
    tenantId: string;
    targetAgentId: string;
    threadId?: string;
    workflowId: string;
  }) => Promise<unknown>;
}

function summarizeContext(context: WorkflowRuntimeContext): string {
  const stepCount = Object.keys(context.steps).length;
  return `workflow=${context.workflowId}; execution=${context.executionId}; tenant=${context.tenantId}; steps=${stepCount}`;
}

export async function executeAgentHandoffNode(
  config: AgentHandoffConfig,
  context: WorkflowRuntimeContext,
  executor: HandoffExecutor
): Promise<unknown> {
  const interpolated = interpolateValue(config, context);

  return executor.execute({
    context: interpolated.context ?? {},
    contextSummary: summarizeContext(context),
    correlationId: interpolated.correlationId ?? context.executionId,
    executionId: context.executionId,
    sourceAgentId: interpolated.sourceAgentId,
    summary: interpolated.summary,
    tenantId: context.tenantId,
    targetAgentId: interpolated.targetAgentId,
    ...(interpolated.threadId ? { threadId: interpolated.threadId } : {}),
    workflowId: context.workflowId
  });
}
