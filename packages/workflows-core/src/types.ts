export type WorkflowStepType =
  | "TRIGGER_WEBHOOK"
  | "TRIGGER_CRON"
  | "TRIGGER_EVENT"
  | "HTTP_REQUEST"
  | "CONDITION"
  | "CODE"
  | "TRANSFORMER"
  | "SEND_NOTIFICATION"
  | "AGENT_EXECUTE"
  | "AI_TEXT_EXTRACT"
  | "DELAY";

export interface DagNode {
  id: string;
  isTrigger?: boolean;
  type?: WorkflowStepType;
}

export type DagRoute =
  | "ALWAYS"
  | "IF_TRUE"
  | "IF_FALSE"
  | "ON_SUCCESS"
  | "ON_FAILURE"
  | "FALLBACK";

export interface DagEdge {
  route?: DagRoute;
  source: string;
  target: string;
}

export interface DagValidationInput {
  edges: DagEdge[];
  nodes: DagNode[];
}

export interface DagValidationOptions {
  requireConnected?: boolean;
  requireSingleTrigger?: boolean;
}

export interface DagValidationResult {
  rootNodeIds: string[];
  topologicalOrder: string[];
}

export interface WorkflowRuntimeContext {
  executionId: string;
  tenantId: string;
  trigger: {
    output: Record<string, unknown>;
    type: string;
  };
  workflowId: string;
  steps: Record<
    string,
    {
      input: unknown;
      output: unknown;
      status: "FAILED" | "SKIPPED" | "SUCCESS" | "WAITING";
    }
  >;
}

