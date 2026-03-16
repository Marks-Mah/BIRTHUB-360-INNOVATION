import { getWebConfig } from "@birthub/config";
import { cookies } from "next/headers";
import type { WorkflowCanvas } from "@birthub/workflows-core";

type WorkflowStatus = "ARCHIVED" | "DRAFT" | "PUBLISHED";

export interface WorkflowExecutionSnapshot {
  completedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  id: string;
  startedAt: string;
  status: "CANCELLED" | "FAILED" | "RUNNING" | "SUCCESS" | "WAITING";
  stepResults: Array<{
    errorMessage: string | null;
    finishedAt: string | null;
    id: string;
    input: Record<string, unknown> | null;
    output: Record<string, unknown> | null;
    startedAt: string;
    status: "FAILED" | "SKIPPED" | "SUCCESS" | "WAITING";
    step: {
      id: string;
      key: string;
      name: string;
      type: string;
    };
  }>;
}

export interface WorkflowDetail {
  definition: WorkflowCanvas | null;
  description: string | null;
  executions: WorkflowExecutionSnapshot[];
  id: string;
  name: string;
  status: WorkflowStatus;
  steps: Array<{
    config: Record<string, unknown>;
    id: string;
    isTrigger: boolean;
    key: string;
    name: string;
    type: string;
  }>;
  transitions: Array<{
    id: string;
    route: string;
    sourceStepId: string;
    targetStepId: string;
  }>;
  triggerType: string;
}

async function fetchJson<T>(path: string): Promise<T> {
  const config = getWebConfig();
  const cookieStore = typeof window === "undefined" ? await cookies() : null;
  const requestInit: RequestInit = {
    cache: "no-store",
    ...(typeof window === "undefined" ? {} : { credentials: "include" }),
    ...(cookieStore ? { headers: { cookie: cookieStore.toString() } } : {})
  };
  const response = await fetch(`${config.NEXT_PUBLIC_API_URL}${path}`, requestInit);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function getWorkflowById(id: string): Promise<WorkflowDetail | null> {
  try {
    const payload = await fetchJson<{
      requestId: string;
      workflow: WorkflowDetail;
    }>(`/api/v1/workflows/${encodeURIComponent(id)}`);
    return payload.workflow;
  } catch {
    return null;
  }
}
