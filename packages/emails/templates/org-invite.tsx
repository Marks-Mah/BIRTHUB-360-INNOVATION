import * as React from "react";

export interface OrganizationInviteEmailProps {
  acceptUrl: string;
  email: string;
  organizationName: string;
  role: string;
}

export function OrganizationInviteEmail({
  acceptUrl,
  email,
  organizationName,
  role
}: Readonly<OrganizationInviteEmailProps>) {
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
                      <td style={{ background: "#135d66", color: "#ffffff", padding: "20px 28px" }}>
                        <div style={{ fontSize: 12, letterSpacing: "0.16em", opacity: 0.82, textTransform: "uppercase" }}>
                          Organization Invite
                        </div>
                        <h1 style={{ fontSize: 28, lineHeight: 1.2, margin: "10px 0 0" }}>Convite para a org {organizationName}</h1>
                      </td>
                    </tr>
                    <tr>
                      <td style={{ padding: 28 }}>
                        <p style={{ marginTop: 0 }}>
                          O usuario <strong>{email}</strong> foi convidado para entrar como <strong>{role}</strong>.
                        </p>
                        <p>
                          <a
                            href={acceptUrl}
                            style={{
                              background: "#135d66",
                              borderRadius: 999,
                              color: "#ffffff",
                              display: "inline-block",
                              padding: "12px 18px",
                              textDecoration: "none"
                            }}
                          >
                            Aceitar convite
                          </a>
                        </p>
                        <p style={{ color: "#486581", fontSize: 14, marginBottom: 0 }}>
                          O link magico aponta para o fluxo de aceitacao do Ciclo 2.
                        </p>
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
