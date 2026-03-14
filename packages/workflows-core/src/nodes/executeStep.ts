import { executeAgentNode, type AgentExecutor } from "./agentExecute.js";
import { executeAiTextExtractNode } from "./aiTextExtract.js";
import { executeCodeNode } from "./code.js";
import { executeConditionNode } from "./condition.js";
import { executeDelayNode } from "./delay.js";
import { executeHttpRequestNode } from "./httpRequest.js";
import {
  executeNotificationNode,
  type NotificationDispatcher
} from "./notification.js";
import { executeTransformerNode } from "./transformer.js";
import type { StepDefinition } from "../schemas/step.schema.js";
import type { WorkflowRuntimeContext } from "../types.js";

export interface StepExecutionDependencies {
  agentExecutor?: AgentExecutor;
  notificationDispatcher?: NotificationDispatcher;
  httpRequestRateLimiter?: { consume: (key: string, limit: number, windowSeconds: number) => Promise<void> };
}

export async function executeStep(
  step: StepDefinition,
  context: WorkflowRuntimeContext,
  dependencies: StepExecutionDependencies = {}
): Promise<unknown> {
  switch (step.type) {
    case "TRIGGER_WEBHOOK":
    case "TRIGGER_CRON":
    case "TRIGGER_EVENT":
      return context.trigger.output;
    case "HTTP_REQUEST":
      return executeHttpRequestNode(step.config, context, dependencies.httpRequestRateLimiter);
    case "CONDITION":
      return executeConditionNode(step.config, context);
    case "CODE":
      return executeCodeNode(step.config, context.steps, context);
    case "TRANSFORMER":
      return executeTransformerNode(step.config, context);
    case "SEND_NOTIFICATION":
      return executeNotificationNode(
        step.config,
        context,
        dependencies.notificationDispatcher
      );
    case "AGENT_EXECUTE":
      if (!dependencies.agentExecutor) {
        throw new Error("AGENT_EXECUTOR_NOT_CONFIGURED");
      }
      return executeAgentNode(step.config, context, dependencies.agentExecutor);
    case "AI_TEXT_EXTRACT":
      return executeAiTextExtractNode(step.config, context);
    case "DELAY":
      return executeDelayNode(step.config);
    default:
      throw new Error(`Unsupported step type: ${(step as { type: string }).type}`);
  }
}

