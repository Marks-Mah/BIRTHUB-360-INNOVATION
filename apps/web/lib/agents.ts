import { getWebConfig } from "@birthub/config";

export type ExecutionStatus = "FAILED" | "RUNNING" | "SUCCESS";

export interface AgentExecutionRow {
  durationMs: number;
  id: string;
  startedAt: string;
  status: ExecutionStatus;
}

export interface AgentSnapshot {
  catalogAgentId: string;
  connectors: Record<string, unknown>;
  executionCount: number;
  executions: AgentExecutionRow[];
  failRate: number;
  id: string;
  keywords: string[];
  lastRun: string | null;
  logs: string[];
  manifest: Record<string, unknown>;
  name: string;
  promptVersions: string[];
  sourceStatus: string;
  status: string;
  tags: string[];
  version: string;
}

interface InstalledAgentsResponse {
  agents: AgentSnapshot[];
  requestId: string;
}

interface InstalledAgentResponse {
  agent: AgentSnapshot;
  requestId: string;
}

const DEFAULT_TENANT_ID = "birthhub-alpha";

function normalizePromptVersions(manifest: Record<string, unknown>): string[] {
  const manifestAgent =
    "agent" in manifest && typeof manifest.agent === "object" && manifest.agent !== null
      ? (manifest.agent as Record<string, unknown>)
      : null;
  const prompt = manifestAgent?.prompt;

  if (typeof prompt === "string" && prompt.trim().length > 0) {
    return [prompt];
  }

  return ["Prompt indisponivel neste ambiente."];
}

function normalizeAgent(agent: AgentSnapshot): AgentSnapshot {
  return {
    ...agent,
    promptVersions:
      Array.isArray(agent.promptVersions) && agent.promptVersions.length > 0
        ? agent.promptVersions
        : normalizePromptVersions(agent.manifest)
  };
}

async function fetchJson<T>(path: string): Promise<T> {
  const config = getWebConfig();
  const response = await fetch(`${config.NEXT_PUBLIC_API_URL}${path}`, {
    cache: "no-store",
    headers: {
      "x-tenant-id": DEFAULT_TENANT_ID
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${path}: ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function listInstalledAgents(): Promise<AgentSnapshot[]> {
  try {
    const payload = await fetchJson<InstalledAgentsResponse>("/api/v1/agents/installed");
    return payload.agents.map((agent) => normalizeAgent(agent));
  } catch {
    return [];
  }
}

export async function getInstalledAgentById(id: string): Promise<AgentSnapshot | null> {
  try {
    const payload = await fetchJson<InstalledAgentResponse>(`/api/v1/agents/installed/${encodeURIComponent(id)}`);
    return normalizeAgent(payload.agent);
  } catch {
    return null;
  }
}
