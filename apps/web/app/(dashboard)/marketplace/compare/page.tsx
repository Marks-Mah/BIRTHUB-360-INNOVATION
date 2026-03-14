import { fetchComparisonMatrix } from "../../../../lib/marketplace-api";

export default async function MarketplaceComparePage() {
  const data = await fetchComparisonMatrix();

  return (
    <main style={{ padding: "1.5rem" }}>
      <h1>Comparativo de Agentes por Dominio</h1>
      <p style={{ color: "var(--muted)" }}>
        Matriz de capabilities: agentes x tools para apoiar decisao de instalacao.
      </p>

      <div style={{ overflowX: "auto" }}>
        <table
          style={{
            background: "rgba(255,255,255,0.82)",
            borderCollapse: "collapse",
            minWidth: 860,
            width: "100%"
          }}
        >
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid var(--border)", padding: "0.6rem", textAlign: "left" }}>
                Agent
              </th>
              <th style={{ borderBottom: "1px solid var(--border)", padding: "0.6rem", textAlign: "left" }}>
                Domain
              </th>
              <th style={{ borderBottom: "1px solid var(--border)", padding: "0.6rem", textAlign: "left" }}>
                Tools
              </th>
            </tr>
          </thead>
          <tbody>
            {data.matrix.map((row) => (
              <tr key={row.agentId}>
                <td style={{ borderBottom: "1px solid var(--border)", padding: "0.6rem" }}>
                  <strong>{row.agentName}</strong>
                  <br />
                  <small style={{ color: "var(--muted)" }}>{row.agentId}</small>
                </td>
                <td style={{ borderBottom: "1px solid var(--border)", padding: "0.6rem" }}>
                  {row.domain.join(", ")}
                </td>
                <td style={{ borderBottom: "1px solid var(--border)", padding: "0.6rem" }}>
                  {row.tools.join(", ")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}

