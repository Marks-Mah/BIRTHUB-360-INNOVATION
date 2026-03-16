import type { AgentManifest } from "../manifest/schema.js";
import type {
  AgentLearningRecord,
  JsonValue
} from "../types/index.js";

export interface ManagedAgentPolicy {
  actions: string[];
  effect: "allow" | "deny";
  enabled?: boolean;
  id: string;
  name: string;
  reason?: string;
}

export interface RuntimePolicyRule {
  action: string;
  effect: "allow" | "deny";
  id: string;
}

export interface RuntimePlannedToolCall {
  input: Record<string, unknown>;
  rationale: string;
  tool: string;
}

export interface AgentRuntimePlanInput {
  contextSummary?: string;
  input: Record<string, unknown>;
  manifest: AgentManifest;
  sharedLearning?: AgentLearningRecord[];
  tenantId: string;
}

export interface AgentRuntimePlan {
  logs: string[];
  toolCalls: RuntimePlannedToolCall[];
}

export interface AgentRuntimeOutputInput {
  input: Record<string, unknown>;
  logs: string[];
  manifest: AgentManifest;
  plan: AgentRuntimePlan;
  sharedLearning?: AgentLearningRecord[];
  steps: Array<{
    call: {
      input: unknown;
      tool: string;
    };
    finishedAt: string;
    output: unknown;
    startedAt: string;
  }>;
}

export interface AgentRuntimeOutput {
  approvals_or_dependencies: string[];
  confidence: "high" | "low" | "medium";
  decisions_to_anticipate: Array<{
    decision: string;
    due_window: string;
    owner: string;
    recommended_action: string;
    why_now: string;
  }>;
  emerging_risks: string[];
  executionMode: "LIVE";
  leading_indicators: string[];
  learning_used: Array<{
    confidence: number;
    id: string;
    summary: string;
  }>;
  next_checkpoint: string;
  opportunities_to_capture: string[];
  preventive_action_plan: Array<{
    action: string;
    checkpoint: string;
    deadline: string;
    expected_impact: string;
    owner: string;
  }>;
  sharedLearningCount: number;
  status: "critical" | "stable" | "watch";
  summary: string;
  tool_results: Array<{
    finishedAt: string;
    output: JsonValue | null;
    startedAt: string;
    tool: string;
  }>;
}

export interface OutputGovernanceDecision {
  reason: string;
  requireApproval: boolean;
  type: "executive-report" | "technical-log";
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readObjective(input: Record<string, unknown>): string {
  const directCandidates = [
    input.objective,
    input.brief,
    input.prompt,
    input.task,
    input.goal,
    typeof input.context === "object" && input.context !== null
      ? (input.context as Record<string, unknown>).objective
      : null
  ];

  for (const candidate of directCandidates) {
    const value = readString(candidate);
    if (value) {
      return value;
    }
  }

  return "Executar o agente com rastreabilidade, governanca e proximo passo claro.";
}

function readPrimaryOwner(input: Record<string, unknown>): string {
  const candidates = [
    input.owner,
    input.requestedBy,
    input.userId,
    typeof input.context === "object" && input.context !== null
      ? (input.context as Record<string, unknown>).owner
      : null
  ];

  for (const candidate of candidates) {
    const value = readString(candidate);
    if (value) {
      return value;
    }
  }

  return "tenant-ops";
}

function normalizeJsonValue(value: unknown): JsonValue | null {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeJsonValue(item))
      .filter((item): item is JsonValue => item !== undefined);
  }

  if (typeof value === "object") {
    const objectValue: Record<string, JsonValue> = {};

    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const normalized = normalizeJsonValue(child);
      if (normalized !== undefined) {
        objectValue[key] = normalized;
      }
    }

    return objectValue;
  }

  return null;
}

function normalizePolicyAction(action: string): string {
  const trimmed = action.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed === "tool:execute") {
    return "tool.*";
  }

  if (trimmed.startsWith("tool:")) {
    return `tool.${trimmed.slice("tool:".length)}`;
  }

  if (trimmed.startsWith("tool.")) {
    return trimmed;
  }

  return trimmed.replace(/:/g, ".");
}

function buildRuntimePolicyRulesFromManifest(
  manifest: AgentManifest
): RuntimePolicyRule[] {
  const rules: RuntimePolicyRule[] = [];

  for (const policy of manifest.policies) {
    for (const action of policy.actions) {
      const normalizedAction = normalizePolicyAction(action);
      if (!normalizedAction) {
        continue;
      }

      rules.push({
        action: normalizedAction,
        effect: policy.effect,
        id: `${policy.id}:${normalizedAction}`
      });
    }
  }

  return rules;
}

function buildRuntimePolicyRulesFromManagedPolicies(
  managedPolicies: ManagedAgentPolicy[] = []
): RuntimePolicyRule[] {
  const rules: RuntimePolicyRule[] = [];

  for (const policy of managedPolicies) {
    if ((policy.enabled ?? true) === false) {
      continue;
    }

    for (const action of policy.actions) {
      const normalizedAction = normalizePolicyAction(action);
      if (!normalizedAction) {
        continue;
      }

      rules.push({
        action: normalizedAction,
        effect: policy.effect,
        id: `${policy.id}:${normalizedAction}`
      });
    }
  }

  return rules;
}

function summarizeLearning(records: AgentLearningRecord[] = []): Array<{
  confidence: number;
  id: string;
  summary: string;
}> {
  return records.slice(0, 5).map((record) => ({
    confidence: record.confidence,
    id: record.id,
    summary: record.summary
  }));
}

function toolIsSensitive(toolId: string): boolean {
  const normalized = toolId.toLowerCase();
  return (
    normalized.includes("approval") ||
    normalized.includes("audit") ||
    normalized.includes("notification") ||
    normalized.includes("sync") ||
    normalized.includes("write") ||
    normalized.includes("adapter")
  );
}

export function buildRuntimePolicyRules(
  manifest: AgentManifest,
  managedPolicies: ManagedAgentPolicy[] = []
): RuntimePolicyRule[] {
  const merged = new Map<string, RuntimePolicyRule>();

  for (const rule of [
    ...buildRuntimePolicyRulesFromManifest(manifest),
    ...buildRuntimePolicyRulesFromManagedPolicies(managedPolicies)
  ]) {
    merged.set(rule.id, rule);
  }

  return Array.from(merged.values());
}

export function buildAgentRuntimePlan(input: AgentRuntimePlanInput): AgentRuntimePlan {
  const objective = readObjective(input.input);
  const sharedLearning = input.sharedLearning ?? [];
  const logs = [
    `Resolved manifest ${input.manifest.agent.id}@${input.manifest.agent.version}.`,
    `Planning live execution for tenant ${input.tenantId}.`,
    `Loaded ${sharedLearning.length} shared learning record(s).`
  ];

  const toolCalls = input.manifest.tools.map((tool, index) => ({
    input: {
      contextSummary: input.contextSummary ?? null,
      objective,
      sequence: index + 1,
      sharedLearning: summarizeLearning(sharedLearning),
      sourcePayload: input.input,
      toolDescription: tool.description,
      toolName: tool.name
    },
    rationale: `Executar ${tool.name} para avancar o objetivo '${objective}'.`,
    tool: tool.id
  }));

  logs.push(`Built ${toolCalls.length} manifest-native tool call(s).`);

  return {
    logs,
    toolCalls
  };
}

export function inferOutputGovernance(input: {
  manifest: AgentManifest;
  plan: AgentRuntimePlan;
}): OutputGovernanceDecision {
  const requiresApprovalByTool = input.plan.toolCalls.some((call) => toolIsSensitive(call.tool));
  const requiresApprovalByUseCase = input.manifest.tags["use-case"].some((tag) =>
    ["autonomous-monitoring", "commercial-operations", "multi-agent-execution"].includes(tag)
  );

  const requireApproval = requiresApprovalByTool || requiresApprovalByUseCase;

  return {
    reason: requireApproval
      ? "Sensitive toolchain or governed use-case detected."
      : "Execution remained within non-sensitive reporting scope.",
    requireApproval,
    type: requireApproval ? "executive-report" : "technical-log"
  };
}

export function buildAgentRuntimeOutput(input: AgentRuntimeOutputInput): AgentRuntimeOutput {
  const owner = readPrimaryOwner(input.input);
  const sharedLearning = input.sharedLearning ?? [];
  const governance = inferOutputGovernance({
    manifest: input.manifest,
    plan: input.plan
  });
  const status: AgentRuntimeOutput["status"] = governance.requireApproval
    ? "watch"
    : sharedLearning.length > 0
      ? "stable"
      : "watch";
  const tool_results = input.steps.map((step) => ({
    finishedAt: step.finishedAt,
    output: normalizeJsonValue(step.output),
    startedAt: step.startedAt,
    tool: step.call.tool
  }));
  const summary =
    governance.requireApproval
      ? `${input.manifest.agent.name} concluiu a execucao live e abriu governanca adicional antes da publicacao final.`
      : `${input.manifest.agent.name} concluiu a execucao live com ${tool_results.length} ferramenta(s) do manifesto.`;

  return {
    approvals_or_dependencies: governance.requireApproval
      ? ["Aprovacao humana recomendada antes de compartilhar externamente."]
      : [],
    confidence: sharedLearning.length > 0 ? "high" : "medium",
    decisions_to_anticipate: [
      {
        decision: "Publicar ou acionar o proximo passo recomendado",
        due_window: "Proxima janela operacional",
        owner,
        recommended_action: governance.requireApproval
          ? "Revisar o output e aprovar a acao sensivel."
          : "Executar o proximo passo priorizado pelo agente.",
        why_now: "A execucao terminou com sinais suficientes para uma decisao operacional."
      }
    ],
    emerging_risks: governance.requireApproval
      ? ["O output envolve acao ou artefato sensivel que pede dupla checagem."]
      : [],
    executionMode: "LIVE",
    leading_indicators: input.plan.toolCalls.map((call) => `tool-ready:${call.tool}`),
    learning_used: summarizeLearning(sharedLearning),
    next_checkpoint: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    opportunities_to_capture: [
      "Reaproveitar o plano e os aprendizados compartilhados em execucoes correlatas."
    ],
    preventive_action_plan: [
      {
        action: governance.requireApproval
          ? "Concluir revisao humana do output"
          : "Propagar o resultado para o proximo fluxo de trabalho",
        checkpoint: "1h",
        deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        expected_impact: governance.requireApproval
          ? "Reduzir risco operacional antes da entrega final."
          : "Ganhar velocidade com rastreabilidade.",
        owner
      }
    ],
    sharedLearningCount: sharedLearning.length,
    status,
    summary,
    tool_results
  };
}
