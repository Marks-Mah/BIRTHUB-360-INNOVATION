"use client";

import { useState } from "react";

import type { AgentSnapshot } from "../../lib/agents";

type TabKey = "executions" | "logs" | "manifest" | "overview";

interface AgentDetailTabsProps {
  agent: AgentSnapshot;
}

const TABS: TabKey[] = ["overview", "executions", "logs", "manifest"];

function readManifestAgent(manifest: Record<string, unknown>): {
  description: string;
  prompt: string;
} {
  if (!manifest.agent || typeof manifest.agent !== "object") {
    return {
      description: "",
      prompt: ""
    };
  }

  const agent = manifest.agent as Record<string, unknown>;

  return {
    description: typeof agent.description === "string" ? agent.description : "",
    prompt: typeof agent.prompt === "string" ? agent.prompt : ""
  };
}

function readLatestLatency(agent: AgentSnapshot): number {
  return Math.max(0, ...agent.executions.map((execution) => execution.durationMs));
}

export function AgentDetailTabs({ agent }: Readonly<AgentDetailTabsProps>) {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const manifestAgent = readManifestAgent(agent.manifest);

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <nav style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: activeTab === tab ? "var(--accent)" : "rgba(255,255,255,0.75)",
              border: "1px solid var(--border)",
              borderRadius: "999px",
              color: activeTab === tab ? "white" : "var(--text)",
              cursor: "pointer",
              padding: "0.45rem 0.95rem",
              textTransform: "capitalize"
            }}
            type="button"
          >
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === "overview" ? (
        <article style={{ display: "grid", gap: "1rem" }}>
          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "1rem",
              display: "grid",
              gap: "0.75rem",
              padding: "1rem"
            }}
          >
            <h3 style={{ margin: 0 }}>Overview</h3>
            <p style={{ color: "var(--muted)", margin: 0 }}>{manifestAgent.description}</p>
            <p style={{ margin: 0 }}>
              Status instalado: <strong>{agent.status}</strong> · status fonte: <strong>{agent.sourceStatus}</strong>
            </p>
            <p style={{ margin: 0 }}>
              Catalogo: <strong>{agent.catalogAgentId}</strong> · versao instalada: <strong>{agent.version}</strong>
            </p>
            <p style={{ margin: 0 }}>
              Runtime: <strong>{agent.runtimeProvider}</strong>
            </p>
            <p style={{ margin: 0 }}>Tags: {agent.tags.join(", ")}</p>
            <p style={{ margin: 0 }}>Keywords: {agent.keywords.join(", ")}</p>
          </div>

          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "1rem",
              display: "grid",
              gap: "0.5rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              padding: "1rem"
            }}
          >
            <div>
              <small style={{ color: "var(--muted)" }}>execution_count</small>
              <p style={{ fontSize: "1.4rem", margin: 0 }}>{agent.executionCount}</p>
            </div>
            <div>
              <small style={{ color: "var(--muted)" }}>fail_rate</small>
              <p style={{ fontSize: "1.4rem", margin: 0 }}>{Math.round(agent.failRate * 100)}%</p>
            </div>
            <div>
              <small style={{ color: "var(--muted)" }}>last_run</small>
              <p style={{ fontSize: "1rem", margin: 0 }}>
                {agent.lastRun ? new Date(agent.lastRun).toLocaleString("pt-BR") : "Nunca executado"}
              </p>
            </div>
            <div>
              <small style={{ color: "var(--muted)" }}>max latency</small>
              <p style={{ fontSize: "1.4rem", margin: 0 }}>{readLatestLatency(agent)}ms</p>
            </div>
          </div>

          <div
            style={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "1rem",
              padding: "1rem"
            }}
          >
            <h3 style={{ marginTop: 0 }}>Prompt oficial</h3>
            <textarea
              readOnly
              rows={12}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "0.75rem",
                fontFamily: "monospace",
                padding: "0.75rem",
                width: "100%"
              }}
              value={manifestAgent.prompt}
            />
          </div>
        </article>
      ) : null}

      {activeTab === "executions" ? (
        <article
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "1rem"
          }}
        >
          <h3 style={{ marginTop: 0 }}>Executions</h3>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>ID</th>
                <th style={{ textAlign: "left" }}>Status</th>
                <th style={{ textAlign: "left" }}>Modo</th>
                <th style={{ textAlign: "left" }}>Inicio</th>
                <th style={{ textAlign: "left" }}>Duracao</th>
              </tr>
            </thead>
            <tbody>
              {agent.executions.map((execution) => (
                <tr key={execution.id}>
                  <td style={{ borderTop: "1px solid var(--border)", padding: "0.45rem 0" }}>{execution.id}</td>
                  <td style={{ borderTop: "1px solid var(--border)", padding: "0.45rem 0" }}>{execution.status}</td>
                  <td style={{ borderTop: "1px solid var(--border)", padding: "0.45rem 0" }}>{execution.mode}</td>
                  <td style={{ borderTop: "1px solid var(--border)", padding: "0.45rem 0" }}>
                    {new Date(execution.startedAt).toLocaleString("pt-BR")}
                  </td>
                  <td style={{ borderTop: "1px solid var(--border)", padding: "0.45rem 0" }}>
                    {execution.durationMs}ms
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {agent.executions.length === 0 ? (
            <p style={{ color: "var(--muted)", marginBottom: 0 }}>Nenhuma execucao persistida ainda.</p>
          ) : null}
        </article>
      ) : null}

      {activeTab === "logs" ? (
        <article
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "1rem"
          }}
        >
          <h3 style={{ marginTop: 0 }}>Logs recentes</h3>
          <ul style={{ marginBottom: 0, marginTop: 0, paddingLeft: "1rem" }}>
            {agent.logs.map((logLine) => (
              <li key={logLine}>{logLine}</li>
            ))}
          </ul>
          {agent.logs.length === 0 ? (
            <p style={{ color: "var(--muted)", marginBottom: 0 }}>Nenhum log persistido ainda.</p>
          ) : null}
        </article>
      ) : null}

      {activeTab === "manifest" ? (
        <article
          style={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: "1rem",
            padding: "1rem"
          }}
        >
          <h3 style={{ marginTop: 0 }}>Manifest</h3>
          <pre
            style={{
              background: "#fff",
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              overflowX: "auto",
              padding: "0.75rem",
              whiteSpace: "pre-wrap"
            }}
          >
            {JSON.stringify(agent.manifest, null, 2)}
          </pre>
        </article>
      ) : null}
    </section>
  );
}
