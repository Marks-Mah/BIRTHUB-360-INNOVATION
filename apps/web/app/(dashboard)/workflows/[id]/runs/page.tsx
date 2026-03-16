"use client";

import "reactflow/dist/style.css";

import { use, useEffect, useMemo, useState, useTransition } from "react";

import { getWebConfig } from "@birthub/config";
import ReactFlow, { Background, MiniMap, type Edge, type Node } from "reactflow";

import type { WorkflowCanvas } from "@birthub/workflows-core";

type WorkflowExecutionSnapshot = {
  completedAt: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  id: string;
  startedAt: string;
  status: "CANCELLED" | "FAILED" | "RUNNING" | "SUCCESS" | "WAITING";
  stepResults: Array<{
    errorMessage: string | null;
    input: Record<string, unknown> | null;
    output: Record<string, unknown> | null;
    status: "FAILED" | "SKIPPED" | "SUCCESS" | "WAITING";
    step: {
      id: string;
      key: string;
      name: string;
      type: string;
    };
  }>;
};

type WorkflowResponse = {
  workflow: {
    definition: WorkflowCanvas | null;
    executions: WorkflowExecutionSnapshot[];
    name: string;
  };
};

const apiBaseUrl = getWebConfig().NEXT_PUBLIC_API_URL;

function buildGraph(canvas: WorkflowCanvas | null): {
  edges: Edge[];
  nodes: Node[];
} {
  const safeCanvas =
    canvas ??
    ({
      steps: [],
      transitions: []
    } satisfies WorkflowCanvas);
  const nodes = safeCanvas.steps.map((step, index) => ({
    data: { label: step.name },
    id: step.key,
    position: {
      x: (index % 4) * 260,
      y: Math.floor(index / 4) * 170
    },
    type: "default"
  }));
  const edges = safeCanvas.transitions.map((transition, index) => ({
    id: `edge_${index + 1}`,
    label: transition.route === "ALWAYS" ? undefined : transition.route,
    source: transition.source,
    target: transition.target,
    type: "smoothstep"
  }));

  return { edges, nodes };
}

function maskSecrets(payload: Record<string, unknown>): string {
  const clone = { ...payload };
  for (const key of Object.keys(clone)) {
    if (key.toLowerCase().includes("secret") || key.toLowerCase().includes("token")) {
      clone[key] = "***";
    }
  }

  return JSON.stringify(clone, null, 2);
}

export default function WorkflowRunsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [workflowName, setWorkflowName] = useState(id);
  const [graph, setGraph] = useState<{ edges: Edge[]; nodes: Node[] }>({ edges: [], nodes: [] });
  const [runs, setRuns] = useState<WorkflowExecutionSnapshot[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string>("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function loadWorkflow(): Promise<void> {
      try {
        const response = await fetch(`${apiBaseUrl}/api/v1/workflows/${encodeURIComponent(id)}`, {
          credentials: "include"
        });

        if (!response.ok) {
          throw new Error(`Falha ao carregar workflow (${response.status}).`);
        }

        const payload = (await response.json()) as WorkflowResponse;
        if (cancelled) {
          return;
        }

        setWorkflowName(payload.workflow.name);
        setGraph(buildGraph(payload.workflow.definition));
        setRuns(payload.workflow.executions);
        setSelectedRunId(payload.workflow.executions[0]?.id ?? "");
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Falha ao carregar execucoes.");
        }
      }
    }

    void loadWorkflow();

    return () => {
      cancelled = true;
    };
  }, [id]);

  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? runs[0];
  const executedStepKeys = useMemo(
    () => new Set(selectedRun?.stepResults.map((result) => result.step.key) ?? []),
    [selectedRun]
  );

  const decoratedEdges = useMemo(
    () =>
      graph.edges.map((edge) => {
        const executed = executedStepKeys.has(edge.source) && executedStepKeys.has(edge.target);
        return {
          ...edge,
          animated: executed,
          style: {
            stroke: executed ? "#2d6a4f" : "#94a3b8",
            strokeWidth: executed ? 3 : 1.4
          }
        };
      }),
    [executedStepKeys, graph.edges]
  );

  const failedStepKey =
    selectedRun?.stepResults.find((result) => result.status === "FAILED")?.step.key ?? null;

  const decoratedNodes = useMemo(
    () =>
      graph.nodes.map((node) => {
        const failed = failedStepKey === node.id;
        const executed = executedStepKeys.has(node.id);
        return {
          ...node,
          style: {
            background: failed ? "#fff5f5" : executed ? "#ecfff5" : "#f8fafc",
            border: failed ? "2px solid #c1121f" : executed ? "2px solid #1b4332" : "1px solid #cbd5e1",
            borderRadius: 10,
            fontWeight: 600,
            padding: "0.25rem 0.55rem"
          }
        };
      }),
    [executedStepKeys, failedStepKey, graph.nodes]
  );

  const metrics = useMemo(() => {
    const successes = runs.filter((run) => run.status === "SUCCESS").length;
    const failures = runs.filter((run) => run.status === "FAILED").length;
    const meanDuration =
      runs.reduce((sum, run) => sum + (run.durationMs ?? 0), 0) / Math.max(runs.length, 1);

    const byNode: Record<string, number[]> = {};
    for (const run of runs) {
      for (const result of run.stepResults) {
        const bucket = byNode[result.step.key] ?? [];
        bucket.push(run.durationMs ?? 0);
        byNode[result.step.key] = bucket;
      }
    }

    const bottleneck = Object.entries(byNode)
      .map(([nodeId, durations]) => ({
        avgDuration: durations.reduce((sum, value) => sum + value, 0) / durations.length,
        nodeId
      }))
      .sort((left, right) => right.avgDuration - left.avgDuration)[0];

    return {
      bottleneck,
      failures,
      meanDuration,
      successes
    };
  }, [runs]);

  const selectedStepResult =
    selectedNodeId && selectedRun
      ? selectedRun.stepResults.find((result) => result.step.key === selectedNodeId) ?? null
      : null;

  return (
    <section style={{ display: "grid", gap: "0.85rem" }}>
      <header>
        <h2 style={{ margin: 0 }}>Workflow Runs - {workflowName}</h2>
        <p style={{ color: "var(--muted)", marginBottom: 0 }}>
          Historico de execucoes reais, debugger visual e retry do workflow publicado.
        </p>
      </header>

      {error ? <p style={{ color: "#9d0208", margin: 0 }}>{error}</p> : null}

      <div
        style={{
          background: "#f8fbff",
          border: "1px solid #d9e2ec",
          borderRadius: 14,
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          padding: "0.75rem"
        }}
      >
        <div>
          <small style={{ color: "#4f5d75" }}>Sucessos</small>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{metrics.successes}</div>
        </div>
        <div>
          <small style={{ color: "#4f5d75" }}>Falhas</small>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{metrics.failures}</div>
        </div>
        <div>
          <small style={{ color: "#4f5d75" }}>Duracao media</small>
          <div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(metrics.meanDuration)} ms</div>
        </div>
        <div>
          <small style={{ color: "#4f5d75" }}>Gargalo</small>
          <div style={{ fontSize: 22, fontWeight: 700 }}>
            {metrics.bottleneck ? metrics.bottleneck.nodeId : "n/a"}
          </div>
        </div>
      </div>

      <div
        style={{
          background: "white",
          border: "1px solid #d9e2ec",
          borderRadius: 14,
          overflow: "hidden"
        }}
      >
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead style={{ background: "#f1f5f9" }}>
            <tr>
              <th style={{ padding: "0.65rem", textAlign: "left" }}>Run</th>
              <th style={{ padding: "0.65rem", textAlign: "left" }}>Status</th>
              <th style={{ padding: "0.65rem", textAlign: "left" }}>Data</th>
              <th style={{ padding: "0.65rem", textAlign: "left" }}>Duracao</th>
              <th style={{ padding: "0.65rem", textAlign: "left" }}>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td style={{ borderTop: "1px solid #e2e8f0", padding: "0.65rem" }}>{run.id}</td>
                <td style={{ borderTop: "1px solid #e2e8f0", padding: "0.65rem" }}>{run.status}</td>
                <td style={{ borderTop: "1px solid #e2e8f0", padding: "0.65rem" }}>
                  {new Date(run.completedAt ?? run.startedAt).toLocaleString("pt-BR")}
                </td>
                <td style={{ borderTop: "1px solid #e2e8f0", padding: "0.65rem" }}>
                  {run.durationMs ?? 0} ms
                </td>
                <td style={{ borderTop: "1px solid #e2e8f0", padding: "0.65rem" }}>
                  <button
                    onClick={() => setSelectedRunId(run.id)}
                    style={{ marginRight: 8 }}
                    type="button"
                  >
                    Debug
                  </button>
                  {run.status === "FAILED" ? (
                    <button
                      disabled={isPending}
                      onClick={() => {
                        setError(null);
                        startTransition(() => {
                          void (async () => {
                            try {
                              const response = await fetch(
                                `${apiBaseUrl}/api/v1/workflows/${encodeURIComponent(id)}/run`,
                                {
                                  body: JSON.stringify({
                                    async: true,
                                    payload: {}
                                  }),
                                  credentials: "include",
                                  headers: {
                                    "content-type": "application/json"
                                  },
                                  method: "POST"
                                }
                              );

                              if (!response.ok) {
                                throw new Error(`Falha ao reenfileirar workflow (${response.status}).`);
                              }

                              setError("Retry aceito. Recarregue em alguns segundos para ver a nova run.");
                            } catch (retryError) {
                              setError(
                                retryError instanceof Error
                                  ? retryError.message
                                  : "Falha ao reenfileirar workflow."
                              );
                            }
                          })();
                        });
                      }}
                      type="button"
                    >
                      Retry falha
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "minmax(0, 1fr) 360px",
          minHeight: 360
        }}
      >
        <div style={{ border: "1px solid #d9e2ec", borderRadius: 14, overflow: "hidden" }}>
          <ReactFlow
            edges={decoratedEdges}
            fitView
            nodes={decoratedNodes}
            nodesDraggable={false}
            onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            panOnDrag={false}
          >
            <MiniMap />
            <Background gap={20} />
          </ReactFlow>
        </div>
        <aside
          style={{
            border: "1px solid #d9e2ec",
            borderRadius: 14,
            display: "grid",
            gridTemplateRows: "auto auto 1fr 1fr",
            padding: "0.7rem"
          }}
        >
          <h4 style={{ margin: 0 }}>Visual Debugger</h4>
          <small style={{ color: "#4f5d75" }}>
            Clique no no para inspecionar input/output real com secrets mascarados.
          </small>
          <div>
            <h5 style={{ marginBottom: 6 }}>Input</h5>
            <pre style={{ fontSize: 12, margin: 0, whiteSpace: "pre-wrap" }}>
              {selectedStepResult?.input ? maskSecrets(selectedStepResult.input) : "{}"}
            </pre>
          </div>
          <div>
            <h5 style={{ marginBottom: 6 }}>Output</h5>
            <pre style={{ fontSize: 12, margin: 0, whiteSpace: "pre-wrap" }}>
              {selectedStepResult?.output ? maskSecrets(selectedStepResult.output) : "{}"}
            </pre>
          </div>
        </aside>
      </div>
    </section>
  );
}
