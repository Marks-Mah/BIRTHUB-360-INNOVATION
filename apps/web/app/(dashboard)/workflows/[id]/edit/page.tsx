"use client";

import "reactflow/dist/style.css";

import { use, useEffect, useMemo, useState, useTransition } from "react";

import { getWebConfig } from "@birthub/config";
import { Play, Save, Shuffle, Zap } from "lucide-react";
import { useForm } from "react-hook-form";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  addEdge,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps
} from "reactflow";

import {
  stepSchema,
  validateDag,
  type WorkflowCanvas
} from "@birthub/workflows-core";

type BuilderNodeData = {
  category: "action" | "condition" | "trigger";
  config: Record<string, unknown>;
  hasError?: boolean;
  label: string;
  stepType:
    | "TRIGGER_WEBHOOK"
    | "HTTP_REQUEST"
    | "CONDITION"
    | "SEND_NOTIFICATION"
    | "DELAY"
    | "TRANSFORMER"
    | "AI_TEXT_EXTRACT"
    | "AGENT_EXECUTE"
    | "AGENT_HANDOFF"
    | "CRM_UPSERT"
    | "WHATSAPP_SEND"
    | "GOOGLE_EVENT"
    | "MS_EVENT"
    | "CODE"
    | "TRIGGER_CRON"
    | "TRIGGER_EVENT";
  status: "draft" | "published";
};

type WorkflowResponse = {
  workflow: {
    definition: WorkflowCanvas | null;
    name: string;
    status: "ARCHIVED" | "DRAFT" | "PUBLISHED";
  };
};

type SidebarForm = {
  configJson: string;
  label: string;
};

const FALLBACK_CANVAS: WorkflowCanvas = {
  steps: [
    {
      config: { method: "POST", path: "/webhooks/trigger/default" },
      isTrigger: true,
      key: "trigger_1",
      name: "Webhook Trigger",
      type: "TRIGGER_WEBHOOK"
    }
  ],
  transitions: []
};

function stepTypeToCategory(stepType: BuilderNodeData["stepType"]): BuilderNodeData["category"] {
  if (stepType.startsWith("TRIGGER")) {
    return "trigger";
  }

  if (stepType === "CONDITION") {
    return "condition";
  }

  return "action";
}

function handleStyle(color: string) {
  return {
    background: color,
    border: "2px solid #fff",
    height: 12,
    width: 12
  };
}

function WorkflowNode({ data }: NodeProps<BuilderNodeData>) {
  const palette =
    data.category === "trigger"
      ? { accent: "#0466c8", bg: "#eef6ff" }
      : data.category === "condition"
        ? { accent: "#9f4d00", bg: "#fff6eb" }
        : { accent: "#0a7f4f", bg: "#ecfff5" };

  return (
    <div
      style={{
        background: palette.bg,
        border: `2px solid ${data.hasError ? "#c1121f" : palette.accent}`,
        borderRadius: 12,
        boxShadow: "0 10px 18px rgba(0,0,0,0.08)",
        minWidth: 210,
        padding: "0.75rem 0.9rem"
      }}
    >
      <Handle position={Position.Left} style={handleStyle(palette.accent)} type="target" />
      <div style={{ color: "#4f4f4f", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em" }}>
        {data.stepType}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{data.label}</div>
      <div style={{ color: "#667085", fontSize: 12, marginTop: 2 }}>
        status: {data.status}
      </div>
      <Handle position={Position.Right} style={handleStyle(palette.accent)} type="source" />
    </div>
  );
}

const nodeTypes = {
  action: WorkflowNode,
  condition: WorkflowNode,
  trigger: WorkflowNode
} as const;

function autoLayout(nodes: Node<BuilderNodeData>[]): Node<BuilderNodeData>[] {
  return nodes.map((node, index) => {
    const column = index % 4;
    const row = Math.floor(index / 4);
    return {
      ...node,
      position: {
        x: column * 280,
        y: row * 180
      }
    };
  });
}

function canvasToFlow(
  canvas: WorkflowCanvas,
  workflowStatus: "ARCHIVED" | "DRAFT" | "PUBLISHED"
): {
  edges: Edge[];
  nodes: Node<BuilderNodeData>[];
} {
  const nodes = canvas.steps.map((step, index) => ({
    data: {
      category: stepTypeToCategory(step.type),
      config: step.config,
      label: step.name,
      status: workflowStatus === "PUBLISHED" ? ("published" as const) : ("draft" as const),
      stepType: step.type
    },
    id: step.key,
    position: {
      x: (index % 4) * 280,
      y: Math.floor(index / 4) * 180
    },
    type: stepTypeToCategory(step.type)
  }));
  const edges = canvas.transitions.map((transition, index) => ({
    id: `edge_${index + 1}`,
    label: transition.route === "ALWAYS" ? undefined : transition.route,
    source: transition.source,
    target: transition.target,
    type: "smoothstep"
  }));

  return {
    edges,
    nodes
  };
}

type WorkflowRoute = "ALWAYS" | "FALLBACK" | "IF_FALSE" | "IF_TRUE" | "ON_FAILURE" | "ON_SUCCESS";

function normalizeEdgeRoute(label: Edge["label"]): WorkflowRoute {
  if (typeof label !== "string") {
    return "ALWAYS";
  }

  if (label === "IF_TRUE" || label === "IF_FALSE" || label === "ON_FAILURE" || label === "ON_SUCCESS" || label === "FALLBACK") {
    return label;
  }

  return "ALWAYS";
}

function flowToCanvas(nodes: Node<BuilderNodeData>[], edges: Edge[]): WorkflowCanvas {
  return {
    steps: nodes.map((node) => ({
      config: node.data.config,
      ...(node.data.stepType.startsWith("TRIGGER") ? { isTrigger: true } : {}),
      key: node.id,
      name: node.data.label,
      type: node.data.stepType
    })),
    transitions: edges.map((edge) => ({
      route: normalizeEdgeRoute(edge.label),
      source: edge.source,
      target: edge.target
    }))
  } as WorkflowCanvas;
}

const apiBaseUrl = getWebConfig().NEXT_PUBLIC_API_URL;

export default function WorkflowEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [workflowName, setWorkflowName] = useState(`Workflow ${id}`);
  const [workflowStatus, setWorkflowStatus] = useState<"ARCHIVED" | "DRAFT" | "PUBLISHED">("DRAFT");
  const [nodes, setNodes, onNodesChange] = useNodesState<BuilderNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId]
  );

  const form = useForm<SidebarForm>({
    defaultValues: {
      configJson: JSON.stringify(selectedNode?.data.config ?? {}, null, 2),
      label: selectedNode?.data.label ?? ""
    }
  });

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
        const canvas = payload.workflow.definition ?? FALLBACK_CANVAS;
        const flow = canvasToFlow(canvas, payload.workflow.status);

        if (cancelled) {
          return;
        }

        setWorkflowName(payload.workflow.name);
        setWorkflowStatus(payload.workflow.status);
        setNodes(autoLayout(flow.nodes));
        setEdges(flow.edges);
        setSelectedNodeId(flow.nodes[0]?.id ?? null);
      } catch (error) {
        if (!cancelled) {
          setLoadingError(error instanceof Error ? error.message : "Falha ao carregar workflow.");
        }
      }
    }

    void loadWorkflow();

    return () => {
      cancelled = true;
    };
  }, [id, setEdges, setNodes]);

  useEffect(() => {
    form.reset({
      configJson: JSON.stringify(selectedNode?.data.config ?? {}, null, 2),
      label: selectedNode?.data.label ?? ""
    });
  }, [selectedNode, form]);

  const validation = useMemo(() => {
    const nodeErrors = new Set<string>();
    const messages: string[] = [];

    for (const node of nodes) {
      const parsed = stepSchema.safeParse({
        config: node.data.config,
        key: node.id,
        name: node.data.label,
        type: node.data.stepType
      });

      if (!parsed.success) {
        nodeErrors.add(node.id);
        messages.push(`${node.data.label}: configuracao invalida para ${node.data.stepType}.`);
      }
    }

    try {
      validateDag({
        edges: edges.map((edge) => ({
          route: normalizeEdgeRoute(edge.label),
          source: edge.source,
          target: edge.target
        })),
        nodes: nodes.map((node) => ({
          id: node.id,
          isTrigger: node.data.stepType.startsWith("TRIGGER"),
          type: node.data.stepType
        }))
      });
    } catch (error) {
      messages.push(error instanceof Error ? error.message : "Erro de DAG.");
    }

    return {
      errors: messages,
      invalidNodeIds: Array.from(nodeErrors).sort()
    };
  }, [edges, nodes]);

  const decoratedNodes = useMemo(() => {
    const invalidNodeIds = new Set(validation.invalidNodeIds);
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        hasError: invalidNodeIds.has(node.id)
      }
    }));
  }, [nodes, validation.invalidNodeIds]);

  async function persistWorkflow(status: "DRAFT" | "PUBLISHED"): Promise<void> {
    const response = await fetch(`${apiBaseUrl}/api/v1/workflows/${encodeURIComponent(id)}`, {
      body: JSON.stringify({
        canvas: flowToCanvas(nodes, edges),
        name: workflowName,
        status
      }),
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      method: "PUT"
    });

    if (!response.ok) {
      throw new Error(`Falha ao salvar workflow (${response.status}).`);
    }

    const payload = (await response.json()) as WorkflowResponse;
    setWorkflowStatus(payload.workflow.status);
    setSaveMessage(status === "PUBLISHED" ? "Workflow publicado." : "Workflow salvo em draft.");
  }

  return (
    <section
      style={{
        display: "grid",
        gap: "0.75rem",
        gridTemplateColumns: "minmax(0, 1fr) 340px",
        height: "calc(100vh - 110px)"
      }}
    >
      <div
        style={{
          border: "1px solid #d0d8e1",
          borderRadius: 16,
          display: "grid",
          gridTemplateRows: "auto 1fr",
          overflow: "hidden"
        }}
      >
        <header
          style={{
            alignItems: "center",
            background: "linear-gradient(120deg, #0f4c5c, #1a936f)",
            color: "#fff",
            display: "flex",
            justifyContent: "space-between",
            padding: "0.7rem 0.9rem"
          }}
        >
          <div style={{ display: "grid", gap: 4 }}>
            <input
              onChange={(event) => setWorkflowName(event.target.value)}
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "1px solid rgba(255,255,255,0.3)",
                borderRadius: 8,
                color: "#fff",
                fontSize: 16,
                fontWeight: 700,
                padding: "0.4rem 0.55rem"
              }}
              value={workflowName}
            />
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              Status atual: {workflowStatus} · editor persistido no backend real.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setNodes((currentNodes) => autoLayout(currentNodes))}
              style={{ alignItems: "center", display: "inline-flex", gap: 6 }}
              type="button"
            >
              <Shuffle size={14} /> Organizar Canvas
            </button>
            <button
              disabled={isPending || validation.errors.length > 0}
              onClick={() => {
                setSaveMessage(null);
                startTransition(() => {
                  void (async () => {
                    try {
                      await persistWorkflow("DRAFT");
                    } catch (error) {
                      setLoadingError(error instanceof Error ? error.message : "Falha ao salvar.");
                    }
                  })();
                });
              }}
              style={{ alignItems: "center", display: "inline-flex", gap: 6 }}
              type="button"
            >
              <Save size={14} /> Salvar
            </button>
            <button
              disabled={isPending || validation.errors.length > 0}
              onClick={() => {
                setSaveMessage(null);
                startTransition(() => {
                  void (async () => {
                    try {
                      await persistWorkflow("PUBLISHED");
                    } catch (error) {
                      setLoadingError(error instanceof Error ? error.message : "Falha ao publicar.");
                    }
                  })();
                });
              }}
              style={{ alignItems: "center", display: "inline-flex", gap: 6 }}
              type="button"
            >
              <Play size={14} /> Publicar
            </button>
          </div>
        </header>
        <div style={{ background: "radial-gradient(circle at 20% 0, #f6f9ff, #fff 60%)" }}>
          <ReactFlow
            edges={edges}
            fitView
            nodeTypes={nodeTypes}
            nodes={decoratedNodes}
            onConnect={(connection) => setEdges((currentEdges) => addEdge(connection, currentEdges))}
            onEdgesChange={onEdgesChange}
            onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
            onNodesChange={onNodesChange}
          >
            <MiniMap pannable zoomable />
            <Controls />
            <Background gap={20} size={1.2} />
          </ReactFlow>
        </div>
      </div>

      <aside
        style={{
          background: "#fff",
          border: "1px solid #d0d8e1",
          borderRadius: 16,
          display: "grid",
          gap: "0.75rem",
          gridTemplateRows: "auto auto 1fr",
          padding: "0.9rem"
        }}
      >
        <h3 style={{ margin: 0 }}>Node Sidebar</h3>
        <div style={{ color: "#455a64", fontSize: 13 }}>
          Esta tela agora carrega e salva o canvas real do workflow. Edite um node e publique sem depender de `initialNodes`.
        </div>

        <form
          onSubmit={form.handleSubmit((values) => {
            if (!selectedNode) {
              return;
            }

            try {
              const config = JSON.parse(values.configJson) as Record<string, unknown>;
              setNodes((currentNodes) =>
                currentNodes.map((node) =>
                  node.id === selectedNode.id
                    ? {
                        ...node,
                        data: {
                          ...node.data,
                          config,
                          label: values.label
                        }
                      }
                    : node
                )
              );
            } catch {
              form.setError("configJson", {
                message: "JSON invalido."
              });
            }
          })}
          style={{ display: "grid", gap: "0.55rem" }}
        >
          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12 }}>Label</span>
            <input {...form.register("label")} />
          </label>

          <label style={{ display: "grid", gap: 4 }}>
            <span style={{ fontSize: 12 }}>Config JSON</span>
            <textarea
              {...form.register("configJson")}
              rows={14}
              style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            />
            {form.formState.errors.configJson ? (
              <small style={{ color: "#c1121f" }}>{form.formState.errors.configJson.message}</small>
            ) : null}
          </label>

          <button type="submit">
            <Zap size={14} /> Aplicar no Node
          </button>
        </form>

        {loadingError ? (
          <div
            style={{
              background: "#fff5f5",
              border: "1px solid #ffb3c1",
              borderRadius: 10,
              color: "#9d0208",
              fontSize: 12,
              padding: "0.65rem"
            }}
          >
            {loadingError}
          </div>
        ) : null}

        {saveMessage ? (
          <div
            style={{
              background: "#edfdf4",
              border: "1px solid #95d5b2",
              borderRadius: 10,
              color: "#1b4332",
              fontSize: 12,
              padding: "0.65rem"
            }}
          >
            {saveMessage}
          </div>
        ) : null}

        {validation.errors.length > 0 ? (
          <div
            style={{
              background: "#fff5f5",
              border: "1px solid #ffb3c1",
              borderRadius: 10,
              color: "#9d0208",
              fontSize: 12,
              marginTop: 6,
              padding: "0.65rem"
            }}
          >
            {validation.errors.map((message) => (
              <div key={message}>{message}</div>
            ))}
          </div>
        ) : (
          <div
            style={{
              background: "#edfdf4",
              border: "1px solid #95d5b2",
              borderRadius: 10,
              color: "#1b4332",
              fontSize: 12,
              marginTop: 6,
              padding: "0.65rem"
            }}
          >
            Canvas valido. Pronto para salvar/publicar.
          </div>
        )}
      </aside>
    </section>
  );
}
