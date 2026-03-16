import { getWebConfig } from "@birthub/config";
import Link from "next/link";

import { FeedbackWidget } from "../../../components/agents/FeedbackWidget";
import { OutputApprovalButton } from "../../../components/outputs/OutputApprovalButton";
import { fetchOutputDetail, fetchOutputs } from "../../../lib/marketplace-api.server";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(value: string | string[] | undefined): string {
  if (!value) {
    return "";
  }

  return Array.isArray(value) ? value[0] ?? "" : value;
}

export default async function OutputsPage({
  searchParams
}: Readonly<{
  searchParams?: Promise<SearchParams>;
}>) {
  const resolvedParams = (await searchParams) ?? {};
  const typeFilter = readParam(resolvedParams.type);
  const executionId = readParam(resolvedParams.executionId);
  const outputId = readParam(resolvedParams.outputId);
  const config = getWebConfig();

  const data = await fetchOutputs({
    ...(executionId ? { executionId } : {}),
    ...(typeFilter ? { type: typeFilter } : {})
  }).catch(() => ({ outputs: [] }));
  const selectedOutput = outputId ? await fetchOutputDetail(outputId).catch(() => null) : null;

  return (
    <main style={{ display: "grid", gap: "1rem", padding: "1.5rem" }}>
      <header style={{ display: "grid", gap: "0.5rem" }}>
        <h1 style={{ margin: 0 }}>Outputs de Agente</h1>
        <p style={{ color: "var(--muted)", margin: 0 }}>
          Lista, filtro, integridade por hash SHA256 e exportacao de saidas criticas.
        </p>
        {executionId ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Filtrando automaticamente pelos outputs ligados a execucao <code>{executionId}</code>.
          </p>
        ) : null}
      </header>

      {executionId ? <FeedbackWidget executionId={executionId} /> : null}

      <form style={{ display: "flex", gap: "0.6rem", maxWidth: 420 }}>
        <input defaultValue={typeFilter} name="type" placeholder="technical-log ou executive-report" type="text" />
        <button type="submit">Filtrar</button>
      </form>

      <div style={{ overflowX: "auto" }}>
        <table style={{ background: "rgba(255,255,255,0.8)", borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem", textAlign: "left" }}>Output ID</th>
              <th style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem", textAlign: "left" }}>Agent</th>
              <th style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem", textAlign: "left" }}>Tipo</th>
              <th style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem", textAlign: "left" }}>Status</th>
              <th style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem", textAlign: "left" }}>Hash</th>
              <th style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem", textAlign: "left" }}>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {data.outputs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "0.75rem" }}>Nenhum output encontrado.</td>
              </tr>
            ) : (
              data.outputs.map((output) => (
                <tr key={output.id}>
                  <td style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem" }}>{output.id}</td>
                  <td style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem" }}>{output.agentId}</td>
                  <td style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem" }}>{output.type}</td>
                  <td style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem" }}>{output.status}</td>
                  <td style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem" }}>
                    <code>{output.outputHash.slice(0, 16)}...</code>
                  </td>
                  <td style={{ borderBottom: "1px solid var(--border)", padding: "0.5rem" }}>
                    <Link
                      href={`/outputs?type=${encodeURIComponent(typeFilter)}${executionId ? `&executionId=${encodeURIComponent(executionId)}` : ""}&outputId=${encodeURIComponent(output.id)}`}
                    >
                      Detalhes
                    </Link>{" "}
                    <a href={`${config.NEXT_PUBLIC_API_URL}/api/v1/outputs/${output.id}/export`}>
                      Exportar PDF/MD
                    </a>
                    {" "}
                    <OutputApprovalButton outputId={output.id} status={output.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedOutput ? (
        <section
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid var(--border)",
            borderRadius: 16,
            display: "grid",
            gap: "0.85rem",
            padding: "1rem"
          }}
        >
          <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ margin: 0 }}>Detalhe do Output</h2>
              <small style={{ color: "var(--muted)" }}>{selectedOutput.output.id}</small>
            </div>
            <span style={{ color: selectedOutput.integrity.isValid ? "#1b4332" : "#9d0208", fontWeight: 700 }}>
              {selectedOutput.integrity.isValid ? "Hash valido" : "Hash divergente"}
            </span>
          </div>
          <div style={{ display: "grid", gap: "0.75rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <div>
              <strong>Hash DB</strong>
              <pre style={{ whiteSpace: "pre-wrap" }}>{selectedOutput.integrity.expectedHash}</pre>
            </div>
            <div>
              <strong>Hash recalculado</strong>
              <pre style={{ whiteSpace: "pre-wrap" }}>{selectedOutput.integrity.recalculatedHash}</pre>
            </div>
          </div>
            <div>
              <strong>Conteudo real</strong>
              <p style={{ margin: "0.35rem 0" }}>
                Status: <strong>{selectedOutput.output.status}</strong>
                {selectedOutput.output.approvedAt ? (
                  <> · aprovado em {new Date(selectedOutput.output.approvedAt).toLocaleString("pt-BR")}</>
                ) : null}
              </p>
              <OutputApprovalButton
                outputId={selectedOutput.output.id}
                status={selectedOutput.output.status}
              />
              <pre
                style={{
                  background: "#f8f6ef",
                borderRadius: 12,
                marginBottom: 0,
                overflowX: "auto",
                padding: "0.8rem",
                whiteSpace: "pre-wrap"
              }}
            >
              {selectedOutput.output.content}
            </pre>
          </div>
        </section>
      ) : null}
    </main>
  );
}

