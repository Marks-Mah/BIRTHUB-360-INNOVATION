"use client";

import "reactflow/dist/style.css";

import { useMemo, useState } from "react";

import ReactFlow, { Background, MiniMap, type Edge, type Node } from "reactflow";

type RunStatus = "Failed" | "Running" | "Success";

type WorkflowRun = {
  durationMs: number;
  executedEdges: string[];
  failedAtNodeId?: string;
  finishedAt: string;
  id: string;
  status: RunStatus;
  stepResults: Record<
    string,
    {
      input: Record<string, unknown>;
      output: Record<string, unknown>;
    }
  >;
};

const baseNodes: Node[] = [
  { id: "trigger", position: { x: 40, y: 120 }, data: { label: "Trigger" }, type: "default" },
  { id: "http", position: { x: 280, y: 120 }, data: { label: "HTTP" }, type: "default" },
  { id: "condition", position: { x: 520, y: 120 }, data: { label: "Condition" }, type: "default" },
  { id: "notify", position: { x: 760, y: 40 }, data: { label: "Notify" }, type: "default" },
  { id: "delay", position: { x: 760, y: 200 }, data: { label: "Delay" }, type: "default" }
];

const baseEdges: Edge[] = [
  { id: "e1", source: "trigger", target: "http", type: "smoothstep" },
  { id: "e2", source: "http", target: "condition", type: "smoothstep" },
  { id: "e3", label: "IF_TRUE", source: "condition", target: "notify", type: "smoothstep" },
  { id: "e4", label: "IF_FALSE", source: "condition", target: "delay", type: "smoothstep" }
];

const initialRuns: WorkflowRun[] = [
  {
    durationMs: 1240,
    executedEdges: ["e1", "e2", "e3"],
    finishedAt: "2026-03-13T11:10:00.000Z",
    id: "run_001",
    status: "Success",
    stepResults: {
      condition: {
        input: { score: 88 },
        output: { result: true }
      },
      http: {
        input: { endpoint: "/health-summary" },
        output: { failRate: 0.12 }
      },
      notify: {
        input: { channel: "email", to: "ops@birthub.local" },
        output: { delivered: true }
      }
    }
  },
  {
    durationMs: 932,
    executedEdges: ["e1", "e2", "e4"],
    failedAtNodeId: "delay",
    finishedAt: "2026-03-13T11:21:00.000Z",
    id: "run_002",
    status: "Failed",
    stepResults: {
      condition: {
        input: { score: 22 },
        output: { result: false }
      },
      delay: {
        input: { duration_ms: 3600000 },
        output: { error: "Redis delayed queue unavailable" }
      }
    }
  },
  {
    durationMs: 340,
    executedEdges: ["e1"],
    finishedAt: "2026-03-13T11:24:00.000Z",
    id: "run_003",
    status: "Running",
    stepResults: {
      trigger: {
        input: { source: "manual" },
        output: { accepted: true }
      }
    }
  }
];

function maskSecrets(payload: Record<string, unknown>): string {
  const clone = { ...payload };
  for (const key of Object.keys(clone)) {
    if (key.toLowerCase().includes("secret") || key.toLowerCase().includes("token")) {
      clone[key] = "***";
    }
  }

  return JSON.stringify(clone, null, 2);
}

export default function WorkflowRunsPage({ params }: { params: { id: string } }) {
  const [runs, setRuns] = useState(initialRuns);
  const [selectedRunId, setSelectedRunId] = useState(initialRuns[0]?.id ?? "");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? runs[0];

  const decoratedEdges = useMemo(
    () =>
      baseEdges.map((edge) => {
        const executed = selectedRun?.executedEdges.includes(edge.id) ?? false;
        return {
          ...edge,
          animated: executed,
          style: {
            stroke: executed ? "#2d6a4f" : "#94a3b8",
            strokeWidth: executed ? 3 : 1.4
          }
        };
      }),
    [selectedRun]
  );

  const decoratedNodes = useMemo(
    () =>
      baseNodes.map((node) => {
        const failed = selectedRun?.failedAtNodeId === node.id;
        return {
          ...node,
          style: {
            background: failed ? "#fff5f5" : "#f8fafc",
            border: failed ? "2px solid #c1121f" : "1px solid #cbd5e1",
            borderRadius: 10,
            fontWeight: 600,
            padding: "0.25rem 0.55rem"
          }
        };
      }),
    [selectedRun]
  );

  const metrics = useMemo(() => {
    const successes = runs.filter((run) => run.status === "Success").length;
    const failures = runs.filter((run) => run.status === "Failed").length;
    const meanDuration =
      runs.reduce((sum, run) => sum + run.durationMs, 0) / Math.max(runs.length, 1);

    const byNode: Record<string, number[]> = {};
    for (const run of runs) {
      for (const [nodeId] of Object.entries(run.stepResults)) {
        byNode[nodeId] = byNode[nodeId] ?? [];
        byNode[nodeId].push(run.durationMs);
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
    selectedNodeId && selectedRun ? selectedRun.stepResults[selectedNodeId] : null;

  return (
    <section style={{ display: "grid", gap: "0.85rem" }}>
      <header>
        <h2 style={{ margin: 0 }}>Workflow Runs - {params.id}</h2>
        <p style={{ color: "var(--muted)", marginBottom: 0 }}>
          Histórico de execuções, debugger visual e retry a partir do nó com falha.
        </p>
      </header>

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
          <small style={{ color: "#4f5d75" }}>Duração média</small>
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
              <th style={{ padding: "0.65rem", textAlign: "left" }}>Duração</th>
              <th style={{ padding: "0.65rem", textAlign: "left" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id}>
                <td style={{ borderTop: "1px solid #e2e8f0", padding: "0.65rem" }}>{run.id}</td>
                <td style={{ borderTop: "1px solid #e2e8f0", padding: "0.65rem" }}>{run.status}</td>
                <td style={{ borderTop: "1px solid #e2e8f0", padding: "0.65rem" }}>
                  {new Date(run.finishedAt).toLocaleString("pt-BR")}
                </td>
                <td style={{ borderTop: "1px solid #e2e8f0", padding: "0.65rem" }}>{run.durationMs} ms</td>
                <td style={{ borderTop: "1px solid #e2e8f0", padding: "0.65rem" }}>
                  <button
                    onClick={() => setSelectedRunId(run.id)}
                    style={{ marginRight: 8 }}
                    type="button"
                  >
                    Debug
                  </button>
                  {run.status === "Failed" ? (
                    <button
                      onClick={() => {
                        const clonedRun: WorkflowRun = {
                          ...run,
                          durationMs: 0,
                          executedEdges: run.executedEdges.filter((edgeId) => edgeId !== "e4"),
                          finishedAt: new Date().toISOString(),
                          id: `retry_${Date.now()}`,
                          status: "Running"
                        };
                        setRuns((current) => [clonedRun, ...current]);
                        setSelectedRunId(clonedRun.id);
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
            Clique no nó para inspecionar input/output real com secrets mascarados.
          </small>
          <div>
            <h5 style={{ marginBottom: 6 }}>Input</h5>
            <pre style={{ fontSize: 12, margin: 0, whiteSpace: "pre-wrap" }}>
              {selectedStepResult ? maskSecrets(selectedStepResult.input) : "{}"}
            </pre>
          </div>
          <div>
            <h5 style={{ marginBottom: 6 }}>Output</h5>
            <pre style={{ fontSize: 12, margin: 0, whiteSpace: "pre-wrap" }}>
              {selectedStepResult ? maskSecrets(selectedStepResult.output) : "{}"}
            </pre>
          </div>
        </aside>
      </div>
    </section>
  );
}
