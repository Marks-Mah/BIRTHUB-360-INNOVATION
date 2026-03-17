import { interpolateValue } from "../interpolation/interpolate.js";
import type { WorkflowRuntimeContext } from "../types.js";

export type ConnectorProvider = "google-workspace" | "hubspot" | "microsoft-graph" | "pipedrive" | "salesforce" | "twilio-whatsapp";

export interface CrmUpsertConfig {
  connectorAccountId?: string | undefined;
  objectType: "company" | "contact" | "deal";
  operation?: "upsert" | undefined;
  payload: Record<string, unknown>;
  provider?: Extract<ConnectorProvider, "hubspot" | "pipedrive" | "salesforce"> | undefined;
  scope?: string | undefined;
}

export interface WhatsappSendConfig {
  connectorAccountId?: string | undefined;
  message: string;
  template?: string | undefined;
  threadId?: string | undefined;
  to: string;
}

export interface CalendarEventConfig {
  attendees?: string[] | undefined;
  calendarId?: string | undefined;
  connectorAccountId?: string | undefined;
  description?: string | undefined;
  end: string;
  start: string;
  title: string;
}

export type ConnectorActionRequest =
  | ({
      kind: "CRM_UPSERT";
    } & CrmUpsertConfig)
  | ({
      kind: "WHATSAPP_SEND";
    } & WhatsappSendConfig)
  | ({
      kind: "GOOGLE_EVENT";
    } & CalendarEventConfig)
  | ({
      kind: "MS_EVENT";
    } & CalendarEventConfig);

export interface ConnectorExecutor {
  execute: (args: {
    action: ConnectorActionRequest;
    contextSummary: string;
    executionId: string;
    tenantId: string;
    workflowId: string;
  }) => Promise<unknown>;
}

function summarizeContext(context: WorkflowRuntimeContext): string {
  const stepCount = Object.keys(context.steps).length;
  return `workflow=${context.workflowId}; execution=${context.executionId}; tenant=${context.tenantId}; steps=${stepCount}`;
}

export async function executeConnectorActionNode(
  action: ConnectorActionRequest,
  context: WorkflowRuntimeContext,
  executor: ConnectorExecutor
): Promise<unknown> {
  return executor.execute({
    action: interpolateValue(action, context),
    contextSummary: summarizeContext(context),
    executionId: context.executionId,
    tenantId: context.tenantId,
    workflowId: context.workflowId
  });
}
