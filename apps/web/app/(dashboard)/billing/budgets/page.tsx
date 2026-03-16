import { getWebConfig } from "@birthub/config";

import { fetchBudgetEstimate, fetchBudgetUsage } from "../../../../lib/marketplace-api.server";

export default async function BudgetsPage() {
  const config = getWebConfig();
  const [usage, estimate] = await Promise.all([
    fetchBudgetUsage().catch(() => ({ alerts: [], records: [], usageEvents: [] })),
    fetchBudgetEstimate("rh-pack").catch(() => ({ estimate: { avgCostBRL: 0.5, details: "Fallback" } }))
  ]);

  return (
    <main style={{ display: "grid", gap: "1.2rem", padding: "1.5rem" }}>
      <header style={{ display: "grid", gap: "0.4rem" }}>
        <h1 style={{ margin: 0 }}>Orcamento por Agente</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Configure limite mensal por agente, acompanhe consumo historico e exporte CSV.
        </p>
      </header>

      <section
        style={{
          background: "rgba(255,255,255,0.8)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "1rem"
        }}
      >
        <h2 style={{ marginTop: 0 }}>Estimativa pre-execucao</h2>
        <p style={{ margin: 0 }}>
          Custo medio estimado: <strong>~R$ {estimate.estimate.avgCostBRL.toFixed(2)}</strong> por execucao
          (RH Pack).
        </p>
        <small style={{ color: "var(--muted)" }}>{estimate.estimate.details}</small>
      </section>

      <section
        style={{
          background: "rgba(255,255,255,0.8)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          display: "grid",
          gap: "0.8rem",
          padding: "1rem"
        }}
      >
        <h2 style={{ margin: 0 }}>Configurar limite</h2>
        <form action={`${config.NEXT_PUBLIC_API_URL}/api/v1/budgets/limits`} method="post" style={{ display: "grid", gap: "0.6rem", maxWidth: 420 }}>
          <label>
            Agent ID
            <input defaultValue="rh-pack" name="agentId" type="text" />
          </label>
          <label>
            Limite mensal (R$)
            <input defaultValue="10" name="limit" step="0.1" type="number" />
          </label>
          <button type="submit">Salvar limite</button>
        </form>
      </section>

      <section style={{ display: "grid", gap: "0.8rem" }}>
        <h2 style={{ margin: 0 }}>Consumo historico</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ background: "rgba(255,255,255,0.8)", borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem", textAlign: "left" }}>Agent</th>
                <th style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem", textAlign: "left" }}>Consumido</th>
                <th style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem", textAlign: "left" }}>Limite</th>
              </tr>
            </thead>
            <tbody>
              {usage.records.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ padding: "0.75rem" }}>Sem dados ainda.</td>
                </tr>
              ) : (
                usage.records.map((record) => (
                  <tr key={`${record.agentId}-${record.limit}`}>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem" }}>{record.agentId}</td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem" }}>R$ {record.consumed.toFixed(2)}</td>
                    <td style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem" }}>R$ {record.limit.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <a href={`${config.NEXT_PUBLIC_API_URL}/api/v1/budgets/export.csv`}>Download CSV</a>
      </section>

      <section
        style={{
          background: "rgba(255,255,255,0.8)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: "1rem"
        }}
      >
        <h3 style={{ marginTop: 0 }}>Alertas</h3>
        {usage.alerts.length === 0 ? (
          <p style={{ margin: 0 }}>Sem alertas ativos.</p>
        ) : (
          <ul>
            {usage.alerts.map((alert) => (
              <li key={`${alert.timestamp}-${alert.level}`}>
                [{alert.level}] {alert.message}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

