"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchWithSession, getStoredSession } from "../../../lib/auth-client";

type MasterDashboardMetrics = {
  llmApiCalls: number;
  llmCostCents: number;
  mau: number;
  totalArrCents: number;
  totalOrganizations: number;
  wau: number;
};

type AgentPerformanceRow = {
  agentId: string;
  failed: number;
  failureRate: number;
  total: number;
};

type QualityRow = {
  agentId: string;
  createdAt: string;
  errorMessage: string | null;
  executionId: string;
  expectedOutput: string | null;
  notes: string | null;
  rating: number;
  status: string;
  tenantId: string;
};

type OperationsDashboardMetrics = {
  failRateAlerts: Array<{
    agentId: string;
    failRate: number;
    tenantId: string;
    windowMinutes: number;
  }>;
  highCostAgents: Array<{
    agentId: string;
    tenantId: string;
    totalCostBrl: number;
  }>;
  pendingApprovals: number;
  queue: {
    active: number;
    pending: number;
    queueName: string;
    waiting: number;
  };
  recentBudgetAlerts: Array<{
    agentId: string;
    createdAt: string;
    kind: string;
    tenantId: string;
  }>;
};

type ImpersonationResult = {
  organizationId: string;
  tenantId: string;
  tokens: {
    csrfToken: string;
    expiresAt: string;
    refreshToken: string;
    token: string;
  };
  userId: string;
};

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    currency: "USD",
    style: "currency"
  }).format(cents / 100);
}

export default function MasterAdminDashboardPage() {
  const session = useMemo(() => getStoredSession(), []);
  const [metrics, setMetrics] = useState<MasterDashboardMetrics | null>(null);
  const [performance, setPerformance] = useState<{
    mostExecuted: AgentPerformanceRow[];
    mostFailed: AgentPerformanceRow[];
  }>({
    mostExecuted: [],
    mostFailed: []
  });
  const [operations, setOperations] = useState<OperationsDashboardMetrics | null>(null);
  const [qualityRows, setQualityRows] = useState<QualityRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tenantToImpersonate, setTenantToImpersonate] = useState("");
  const [impersonation, setImpersonation] = useState<ImpersonationResult | null>(null);

  useEffect(() => {
    if (!session) {
      return;
    }

    void Promise.all([
      fetchWithSession("/api/v1/analytics/master-dashboard", { cache: "no-store" }),
      fetchWithSession("/api/v1/analytics/agent-performance", { cache: "no-store" }),
      fetchWithSession("/api/v1/analytics/quality-report", { cache: "no-store" }),
      fetchWithSession("/api/v1/analytics/operations", { cache: "no-store" })
    ])
      .then(async ([metricsResponse, performanceResponse, qualityResponse, operationsResponse]) => {
        if (!metricsResponse.ok || !performanceResponse.ok || !qualityResponse.ok || !operationsResponse.ok) {
          throw new Error("Nao foi possivel carregar o dashboard master admin.");
        }

        const metricsPayload = (await metricsResponse.json()) as {
          metrics: MasterDashboardMetrics;
        };
        const performancePayload = (await performanceResponse.json()) as {
          metrics: {
            mostExecuted: AgentPerformanceRow[];
            mostFailed: AgentPerformanceRow[];
          };
        };
        const qualityPayload = (await qualityResponse.json()) as {
          items: QualityRow[];
        };
        const operationsPayload = (await operationsResponse.json()) as {
          metrics: OperationsDashboardMetrics;
        };

        setMetrics(metricsPayload.metrics);
        setPerformance(performancePayload.metrics);
        setOperations(operationsPayload.metrics);
        setQualityRows(qualityPayload.items ?? []);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Falha ao carregar dashboard master admin."
        );
      });
  }, [session]);

  return (
    <main
      style={{
        display: "grid",
        gap: "1rem",
        margin: "0 auto",
        maxWidth: 1240,
        padding: "1.5rem"
      }}
    >
      <section className="hero-card">
        <span className="badge">SUPER_ADMIN</span>
        <h1>Dashboard global da plataforma</h1>
        <p style={{ marginBottom: 0 }}>
          Visao unica de ARR, custo de LLM, atividade, qualidade e suporte via impersonation.
        </p>
      </section>

      <section className="stats-grid">
        <article>
          <span className="badge">Total Orgs</span>
          <strong>{metrics?.totalOrganizations ?? 0}</strong>
        </article>
        <article>
          <span className="badge">Total ARR</span>
          <strong>{formatCurrency(metrics?.totalArrCents ?? 0)}</strong>
        </article>
        <article>
          <span className="badge">WAU / MAU</span>
          <strong>
            {(metrics?.wau ?? 0).toLocaleString("pt-BR")} /{" "}
            {(metrics?.mau ?? 0).toLocaleString("pt-BR")}
          </strong>
        </article>
        <article>
          <span className="badge">LLM API Calls</span>
          <strong>{(metrics?.llmApiCalls ?? 0).toLocaleString("pt-BR")}</strong>
        </article>
        <article>
          <span className="badge">Custo LLM</span>
          <strong>{formatCurrency(metrics?.llmCostCents ?? 0)}</strong>
        </article>
      </section>

      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))"
        }}
      >
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Agentes mais executados</h2>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {performance.mostExecuted.map((item) => (
              <div key={item.agentId} style={{ display: "grid", gap: "0.25rem" }}>
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    justifyContent: "space-between"
                  }}
                >
                  <strong>{item.agentId}</strong>
                  <small>{item.total} execucoes</small>
                </div>
                <div className="meter">
                  <span style={{ width: `${Math.min(100, item.total)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Agentes que mais falham</h2>
          <div style={{ display: "grid", gap: "0.65rem" }}>
            {performance.mostFailed.map((item) => (
              <div key={item.agentId} style={{ display: "grid", gap: "0.25rem" }}>
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    justifyContent: "space-between"
                  }}
                >
                  <strong>{item.agentId}</strong>
                  <small>{(item.failureRate * 100).toFixed(1)}% fail rate</small>
                </div>
                <div className="meter">
                  <span style={{ width: `${Math.min(100, item.failureRate * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))"
        }}
      >
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Operacao de agentes</h2>
          <p style={{ color: "var(--muted)" }}>
            Fila <strong>{operations?.queue.queueName ?? "agent-normal"}</strong> com{" "}
            <strong>{operations?.queue.pending ?? 0}</strong> itens pendentes e{" "}
            <strong>{operations?.queue.active ?? 0}</strong> em execucao.
          </p>
          <p style={{ marginBottom: 0 }}>
            <strong>{operations?.pendingApprovals ?? 0}</strong> outputs aguardando aprovacao.
          </p>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Alertas quentes</h2>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {(operations?.failRateAlerts ?? []).slice(0, 4).map((alert) => (
              <div key={`${alert.tenantId}-${alert.agentId}`}>
                <strong>{alert.agentId}</strong> em <code>{alert.tenantId}</code> com{" "}
                {(alert.failRate * 100).toFixed(1)}% de falha
              </div>
            ))}
            {operations && operations.failRateAlerts.length === 0 ? (
              <div>Sem alertas de fail rate nos ultimos 5 minutos.</div>
            ) : null}
          </div>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Maior custo 24h</h2>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {(operations?.highCostAgents ?? []).slice(0, 4).map((item) => (
              <div key={`${item.tenantId}-${item.agentId}`}>
                <strong>{item.agentId}</strong> em <code>{item.tenantId}</code>: R${" "}
                {item.totalCostBrl.toFixed(2)}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            justifyContent: "space-between"
          }}
        >
          <div>
            <h2 style={{ marginTop: 0 }}>Impersonation segura</h2>
            <p style={{ color: "var(--muted)", marginBottom: 0 }}>
              Gera uma sessao auditada para entrar rapidamente na org com problema.
            </p>
          </div>
          <button
            className="ghost-button"
            onClick={() => window.print()}
            type="button"
          >
            Exportar PDF via print
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns: "2fr auto"
          }}
        >
          <input
            onChange={(event) => setTenantToImpersonate(event.target.value)}
            placeholder="tenantId, slug ou organizationId"
            type="text"
            value={tenantToImpersonate}
          />
          <button
            className="action-button"
            onClick={() => {
              setError(null);

              void fetchWithSession("/api/v1/admin/impersonations", {
                body: JSON.stringify({
                  tenantReference: tenantToImpersonate
                }),
                headers: {
                  "content-type": "application/json"
                },
                method: "POST"
              })
                .then(async (response) => {
                  if (!response.ok) {
                    throw new Error(`Falha ao gerar impersonation (${response.status}).`);
                  }

                  const payload = (await response.json()) as ImpersonationResult;
                  localStorage.setItem("bh_csrf_token", payload.tokens.csrfToken);
                  localStorage.setItem("bh_tenant_id", payload.tenantId);
                  localStorage.setItem("bh_user_id", payload.userId);
                  localStorage.removeItem("bh_access_token");
                  localStorage.removeItem("bh_refresh_token");
                  setImpersonation(payload);
                })
                .catch((impersonationError) => {
                  setError(
                    impersonationError instanceof Error
                      ? impersonationError.message
                      : "Falha ao gerar impersonation."
                  );
                });
            }}
            type="button"
          >
            Gerar sessao
          </button>
        </div>
        {impersonation ? (
          <p style={{ marginBottom: 0 }}>
            Sessao trocada para <strong>{impersonation.tenantId}</strong>. Recarregue a area do
            cliente para simular a conta.
          </p>
        ) : null}
      </section>

      <section className="panel">
        <h2 style={{ marginTop: 0 }}>Piores interacoes para auditoria</h2>
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Agente</th>
                <th>Execucao</th>
                <th>Tenant</th>
                <th>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {qualityRows.length === 0 ? (
                <tr>
                  <td colSpan={5}>{error ?? "Nenhum feedback negativo encontrado."}</td>
                </tr>
              ) : (
                qualityRows.map((row) => (
                  <tr key={`${row.executionId}-${row.createdAt}`}>
                    <td>{new Date(row.createdAt).toLocaleString("pt-BR")}</td>
                    <td>{row.agentId}</td>
                    <td>{row.executionId}</td>
                    <td>{row.tenantId}</td>
                    <td>
                      {row.expectedOutput ?? row.notes ?? row.errorMessage ?? "Sem detalhe adicional"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

