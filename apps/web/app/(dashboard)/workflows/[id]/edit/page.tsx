"use client";

import "reactflow/dist/style.css";

import { useEffect, useMemo, useState } from "react";

import dagre from "dagre";
import { Play, Shuffle, Zap } from "lucide-react";
import { useForm } from "react-hook-form";
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  Handle,
  MiniMap,
  Position,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps
} from "reactflow";

import { stepSchema, validateDag } from "@birthub/workflows-core";

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
    | "CODE";
  status: "idle" | "published";
};

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

const initialNodes: Node<BuilderNodeData>[] = [
  {
    data: {
      category: "trigger",
      config: { method: "POST", path: "/webhooks/trigger/onboarding" },
      label: "Webhook Trigger",
      status: "published",
      stepType: "TRIGGER_WEBHOOK"
    },
    id: "trigger_1",
    position: { x: 100, y: 120 },
    type: "trigger"
  },
  {
    data: {
      category: "action",
      config: {
        map: {
          leadEmail: "{{ trigger.output.email }}",
          tenant: "{{ tenantId }}"
        },
        sourcePath: "trigger.output.items"
      },
      label: "Normalize Payload",
      status: "published",
      stepType: "TRANSFORMER"
    },
    id: "action_transform",
    position: { x: 320, y: 120 },
    type: "action"
  },
  {
    data: {
      category: "action",
      config: { method: "POST", url: "https://api.partner.birthhub.test/contacts" },
      label: "Create Contact",
      status: "published",
      stepType: "HTTP_REQUEST"
    },
    id: "action_http",
    position: { x: 560, y: 120 },
    type: "action"
  },
  {
    data: {
      category: "condition",
      config: { operator: ">", path: "steps.action_http.output.score", value: 70 },
      label: "Lead Score > 70?",
      status: "published",
      stepType: "CONDITION"
    },
    id: "condition_1",
    position: { x: 800, y: 120 },
    type: "condition"
  },
  {
    data: {
      category: "action",
      config: { channel: "email", message: "Lead quente detectado!", to: "ops@birthub.local" },
      label: "Notify Ops",
      status: "published",
      stepType: "SEND_NOTIFICATION"
    },
    id: "action_notify",
    position: { x: 1040, y: 30 },
    type: "action"
  },
  {
    data: {
      category: "action",
      config: {
        fields: ["company", "priority"],
        text: "company: {{ trigger.output.company }}\npriority: enterprise"
      },
      label: "Extract CRM Fields",
      status: "published",
      stepType: "AI_TEXT_EXTRACT"
    },
    id: "action_extract",
    position: { x: 1280, y: 30 },
    type: "action"
  },
  {
    data: {
      category: "action",
      config: {
        agentId: "ceo-pack",
        input: {
          brief: "{{ trigger.output.company }}"
        },
        onError: "stop"
      },
      label: "CEO Review",
      status: "published",
      stepType: "AGENT_EXECUTE"
    },
    id: "action_agent",
    position: { x: 1520, y: 30 },
    type: "action"
  },
  {
    data: {
      category: "action",
      config: {
        source: "return { approved: true, owner: 'growth' };",
        timeout_ms: 250
      },
      label: "Code Gate",
      status: "published",
      stepType: "CODE"
    },
    id: "action_code",
    position: { x: 1760, y: 30 },
    type: "action"
  },
  {
    data: {
      category: "action",
      config: { duration_ms: 3600000 },
      label: "Delay 1h",
      status: "published",
      stepType: "DELAY"
    },
    id: "action_delay",
    position: { x: 1040, y: 220 },
    type: "action"
  },
  {
    data: {
      category: "action",
      config: {
        source: "return { slaBreached: false, retryAt: '2026-03-13T16:00:00Z' };",
        timeout_ms: 250
      },
      label: "Fallback Code",
      status: "published",
      stepType: "CODE"
    },
    id: "action_retry_plan",
    position: { x: 1280, y: 220 },
    type: "action"
  },
  {
    data: {
      category: "action",
      config: { channel: "inapp", message: "Fluxo finalizado", to: "owner@birthhub.local" },
      label: "Close Loop",
      status: "published",
      stepType: "SEND_NOTIFICATION"
    },
    id: "action_close",
    position: { x: 2000, y: 120 },
    type: "action"
  }
];

const initialEdges: Edge[] = [
  { id: "e1", source: "trigger_1", target: "action_transform", type: "smoothstep" },
  { id: "e2", source: "action_transform", target: "action_http", type: "smoothstep" },
  { id: "e3", source: "action_http", target: "condition_1", type: "smoothstep" },
  { id: "e4", label: "IF_TRUE", source: "condition_1", target: "action_notify", type: "smoothstep" },
  { id: "e5", source: "action_notify", target: "action_extract", type: "smoothstep" },
  { id: "e6", source: "action_extract", target: "action_agent", type: "smoothstep" },
  { id: "e7", source: "action_agent", target: "action_code", type: "smoothstep" },
  { id: "e8", source: "action_code", target: "action_close", type: "smoothstep" },
  { id: "e9", label: "IF_FALSE", source: "condition_1", target: "action_delay", type: "smoothstep" },
  { id: "e10", source: "action_delay", target: "action_retry_plan", type: "smoothstep" },
  { id: "e11", source: "action_retry_plan", target: "action_close", type: "smoothstep" }
];

type SidebarForm = {
  configJson: string;
  label: string;
};

function autoLayout(nodes: Node<BuilderNodeData>[], edges: Edge[]): Node<BuilderNodeData>[] {
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));
  graph.setGraph({ rankdir: "LR", ranksep: 100 });

  for (const node of nodes) {
    graph.setNode(node.id, { height: 92, width: 220 });
  }

  for (const edge of edges) {
    graph.setEdge(edge.source, edge.target);
  }

  dagre.layout(graph);
  return nodes.map((node) => {
    const position = graph.node(node.id);
    return {
      ...node,
      position: {
        x: position.x - 110,
        y: position.y - 46
      }
    };
  });
}

export default function WorkflowEditPage({ params }: { params: { id: string } }) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(initialNodes[0]?.id ?? null);
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
        messages.push(`${node.data.label}: configuração inválida para ${node.data.stepType}.`);
      }
    }

    try {
      validateDag({
        edges: edges.map((edge) => ({
          route: edge.label === "IF_TRUE" ? "IF_TRUE" : edge.label === "IF_FALSE" ? "IF_FALSE" : "ALWAYS",
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

    for (const node of nodes) {
      const attached = edges.some((edge) => edge.source === node.id || edge.target === node.id);
      if (!attached && nodes.length > 1) {
        nodeErrors.add(node.id);
        messages.push(`${node.data.label}: nó sem aresta conectada.`);
      }
    }

    return {
      errors: messages,
      invalidNodeIds: nodeErrors
    };
  }, [edges, nodes]);

  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          hasError: validation.invalidNodeIds.has(node.id)
        }
      }))
    );
  }, [setNodes, validation.invalidNodeIds]);

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
          <div>
            <div style={{ fontWeight: 700 }}>Workflow Canvas - {params.id}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>
              Builder visual com validação em tempo real de DAG e schema.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setNodes((currentNodes) => autoLayout(currentNodes, edges))}
              style={{ alignItems: "center", display: "inline-flex", gap: 6 }}
              type="button"
            >
              <Shuffle size={14} /> Organizar Canvas
            </button>
            <button
              disabled={validation.errors.length > 0}
              style={{ alignItems: "center", display: "inline-flex", gap: 6 }}
              type="button"
            >
              <Play size={14} /> Publish
            </button>
          </div>
        </header>
        <div style={{ background: "radial-gradient(circle at 20% 0, #f6f9ff, #fff 60%)" }}>
          <ReactFlow
            edges={edges}
            fitView
            nodeTypes={nodeTypes}
            nodes={nodes}
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
          Selecione um node para editar o JSON schema. Erros são destacados em vermelho no canvas.
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
                message: "JSON inválido."
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
              <small style={{ color: "#c1121f" }}>
                {form.formState.errors.configJson.message}
              </small>
            ) : null}
          </label>

          <button type="submit">
            <Zap size={14} /> Aplicar no Node
          </button>
        </form>

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
            Canvas válido. Pronto para salvar/publicar.
          </div>
        )}
      </aside>
    </section>
  );
}

