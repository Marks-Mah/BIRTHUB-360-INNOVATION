import { executeAgentNode, type AgentExecutor } from "./agentExecute.js";
import {
  executeAgentHandoffNode,
  type HandoffExecutor
} from "./agentHandoff.js";
import { executeAiTextExtractNode } from "./aiTextExtract.js";
import { executeCodeNode } from "./code.js";
import { executeConditionNode } from "./condition.js";
import {
  executeConnectorActionNode,
  type ConnectorExecutor
} from "./connectorAction.js";
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
  connectorExecutor?: ConnectorExecutor;
  handoffExecutor?: HandoffExecutor;
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
    case "AGENT_HANDOFF":
      if (!dependencies.handoffExecutor) {
        throw new Error("HANDOFF_EXECUTOR_NOT_CONFIGURED");
      }
      return executeAgentHandoffNode(
        {
          context: step.config.context,
          ...(step.config.correlationId ? { correlationId: step.config.correlationId } : {}),
          sourceAgentId: step.config.sourceAgentId,
          summary: step.config.summary,
          targetAgentId: step.config.targetAgentId,
          ...(step.config.threadId ? { threadId: step.config.threadId } : {})
        },
        context,
        dependencies.handoffExecutor
      );
    case "CRM_UPSERT":
      if (!dependencies.connectorExecutor) {
        throw new Error("CONNECTOR_EXECUTOR_NOT_CONFIGURED");
      }
      return executeConnectorActionNode(
        {
          kind: "CRM_UPSERT",
          ...(step.config.connectorAccountId
            ? { connectorAccountId: step.config.connectorAccountId }
            : {}),
          ...step.config
        },
        context,
        dependencies.connectorExecutor
      );
    case "WHATSAPP_SEND":
      if (!dependencies.connectorExecutor) {
        throw new Error("CONNECTOR_EXECUTOR_NOT_CONFIGURED");
      }
      return executeConnectorActionNode(
        {
          kind: "WHATSAPP_SEND",
          ...(step.config.connectorAccountId
            ? { connectorAccountId: step.config.connectorAccountId }
            : {}),
          message: step.config.message,
          ...(step.config.template ? { template: step.config.template } : {}),
          ...(step.config.threadId ? { threadId: step.config.threadId } : {}),
          to: step.config.to
        },
        context,
        dependencies.connectorExecutor
      );
    case "GOOGLE_EVENT":
      if (!dependencies.connectorExecutor) {
        throw new Error("CONNECTOR_EXECUTOR_NOT_CONFIGURED");
      }
      return executeConnectorActionNode(
        {
          kind: "GOOGLE_EVENT",
          attendees: step.config.attendees,
          ...(step.config.calendarId ? { calendarId: step.config.calendarId } : {}),
          ...(step.config.connectorAccountId
            ? { connectorAccountId: step.config.connectorAccountId }
            : {}),
          ...(step.config.description ? { description: step.config.description } : {}),
          end: step.config.end,
          start: step.config.start,
          title: step.config.title
        },
        context,
        dependencies.connectorExecutor
      );
    case "MS_EVENT":
      if (!dependencies.connectorExecutor) {
        throw new Error("CONNECTOR_EXECUTOR_NOT_CONFIGURED");
      }
      return executeConnectorActionNode(
        {
          kind: "MS_EVENT",
          attendees: step.config.attendees,
          ...(step.config.calendarId ? { calendarId: step.config.calendarId } : {}),
          ...(step.config.connectorAccountId
            ? { connectorAccountId: step.config.connectorAccountId }
            : {}),
          ...(step.config.description ? { description: step.config.description } : {}),
          end: step.config.end,
          start: step.config.start,
          title: step.config.title
        },
        context,
        dependencies.connectorExecutor
      );
    case "AI_TEXT_EXTRACT":
      return executeAiTextExtractNode(step.config, context);
    case "DELAY":
      return executeDelayNode(step.config);
    default:
      throw new Error(`Unsupported step type: ${(step as { type: string }).type}`);
  }
}

