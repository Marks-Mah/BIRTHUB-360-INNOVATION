"use client";

import { useMemo, useState } from "react";

import { useAnalytics } from "../../providers/AnalyticsProvider";
import { FeedbackWidget } from "./FeedbackWidget";

interface AgentRunPanelProps {
  agentId: string;
  apiUrl: string;
}

interface StreamLog {
  index: number;
  message: string;
}

const INITIAL_INPUT = JSON.stringify(
  {
    context: {
      objective: "Executar dry-run governado com publicacao de aprendizado",
      origin: "Agent Studio"
    }
  },
  null,
  2
);

function readTenantId(): string {
  if (typeof window === "undefined") {
    return "birthhub-alpha";
  }

  return (
    window.localStorage.getItem("bh_tenant_id") ??
    window.localStorage.getItem("tenantId") ??
    "birthhub-alpha"
  );
}

export function AgentRunPanel({ agentId, apiUrl }: Readonly<AgentRunPanelProps>) {
  const { track } = useAnalytics();
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [inputPayload, setInputPayload] = useState(INITIAL_INPUT);
  const [logs, setLogs] = useState<StreamLog[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamUrl = useMemo(() => {
    if (!executionId) {
      return null;
    }

    return `${apiUrl}/api/v1/agents/installed/${agentId}/run/stream?executionId=${encodeURIComponent(executionId)}&tenantId=${encodeURIComponent(readTenantId())}`;
  }, [agentId, apiUrl, executionId]);

  async function handleRun(): Promise<void> {
    setError(null);
    setLogs([]);
    setIsRunning(true);

    try {
      const parsedPayload = JSON.parse(inputPayload) as Record<string, unknown>;
      const tenantId = readTenantId();
      const response = await fetch(`${apiUrl}/api/v1/agents/installed/${agentId}/run`, {
        body: JSON.stringify(parsedPayload),
        credentials: "include",
        headers: {
          "content-type": "application/json",
          "x-tenant-id": tenantId
        },
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(`Falha ao iniciar execução (${response.status}).`);
      }

      const payload = (await response.json()) as { executionId: string };
      setExecutionId(payload.executionId);
      track("Agent Executed", {
        agentId,
        executionId: payload.executionId,
        type: "manual"
      });

      const source = new EventSource(
        `${apiUrl}/api/v1/agents/installed/${agentId}/run/stream?executionId=${encodeURIComponent(payload.executionId)}&tenantId=${encodeURIComponent(tenantId)}`
      );

      source.addEventListener("log", (event) => {
        const parsed = JSON.parse((event as MessageEvent).data) as StreamLog;
        setLogs((current) => [...current, parsed]);
      });

      source.addEventListener("done", () => {
        source.close();
        setIsRunning(false);
      });

      source.addEventListener("error", () => {
        source.close();
        setIsRunning(false);
        setError("Stream SSE interrompido ou execução expirada.");
      });
    } catch (runError) {
      setIsRunning(false);
      setError(runError instanceof Error ? runError.message : "Falha desconhecida ao executar agente.");
    }
  }

  return (
    <section style={{ display: "grid", gap: "0.85rem" }}>
      <label style={{ display: "grid", gap: "0.35rem" }}>
        <span>Input manual (JSON)</span>
        <textarea
          onChange={(event) => setInputPayload(event.target.value)}
          rows={10}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "0.75rem",
            fontFamily: "monospace",
            fontSize: "0.9rem",
            padding: "0.75rem"
          }}
          value={inputPayload}
        />
      </label>

      <div style={{ alignItems: "center", display: "flex", gap: "0.75rem" }}>
        <button
          disabled={isRunning}
          onClick={() => {
            void handleRun();
          }}
          style={{
            background: "var(--accent)",
            border: "none",
            borderRadius: "999px",
            color: "white",
            cursor: "pointer",
            padding: "0.6rem 1.1rem"
          }}
          type="button"
        >
          {isRunning ? "Executando..." : "Executar agente"}
        </button>
        {executionId ? <code>{executionId}</code> : null}
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: "0.75rem",
          minHeight: "180px",
          padding: "0.75rem"
        }}
      >
        <strong>Resultado em tempo real (SSE)</strong>
        {streamUrl ? <p style={{ color: "var(--muted)", marginBottom: "0.5rem" }}>Stream: {streamUrl}</p> : null}
        <ul style={{ margin: 0, paddingLeft: "1rem" }}>
          {logs.map((log) => (
            <li key={`${log.index}-${log.message}`}>{log.message}</li>
          ))}
        </ul>
        {error ? <p style={{ color: "#a11d2d" }}>{error}</p> : null}
      </div>

      {executionId ? <FeedbackWidget executionId={executionId} /> : null}
    </section>
  );
}

