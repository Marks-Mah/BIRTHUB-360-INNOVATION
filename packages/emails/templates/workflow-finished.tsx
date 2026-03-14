import * as React from "react";

export interface WorkflowFinishedEmailProps {
  agentId: string;
  executionId: string;
  link?: string;
}

export function WorkflowFinishedEmail({
  agentId,
  executionId,
  link
}: Readonly<WorkflowFinishedEmailProps>) {
  return (
    <html lang="pt-BR">
      <body style={{ background: "#f5efe4", color: "#102a43", fontFamily: "Arial, sans-serif", margin: 0 }}>
        <table role="presentation" width="100%" cellPadding="0" cellSpacing="0" style={{ padding: 24 }}>
          <tbody>
            <tr>
              <td align="center">
                <table role="presentation" width="640" cellPadding="0" cellSpacing="0" style={{ background: "#ffffff", border: "1px solid #d9e2ec", borderRadius: 18 }}>
                  <tbody>
                    <tr>
                      <td style={{ background: "#0f766e", color: "#ffffff", padding: "20px 28px" }}>
                        <div style={{ fontSize: 12, letterSpacing: "0.16em", opacity: 0.82, textTransform: "uppercase" }}>
                          Workflow
                        </div>
                        <h1 style={{ fontSize: 28, lineHeight: 1.2, margin: "10px 0 0" }}>Workflow terminou</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: 28 }}>
                        <p style={{ marginTop: 0 }}>
                          O fluxo vinculado ao agente <strong>{agentId}</strong> terminou com sucesso.
                        </p>
                        <p>
                          <strong>Execucao:</strong> {executionId}
                        </p>
                        {link ? (
                          <p>
                            <a
                              href={link}
                              style={{
                                background: "#0f766e",
                                borderRadius: 999,
                                color: "#ffffff",
                                display: "inline-block",
                                padding: "12px 18px",
                                textDecoration: "none"
                              }}
                            >
                              Abrir execucao
                            </a>
                          </p>
                        ) : null}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>
      </body>
    </html>
  );
}
