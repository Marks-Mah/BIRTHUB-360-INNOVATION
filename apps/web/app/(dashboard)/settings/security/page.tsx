"use client";

import { useEffect, useState } from "react";

import { getWebConfig } from "@birthub/config";

import { fetchWithSession } from "../../../../lib/auth-client";

interface SessionItem {
  id: string;
  ipAddress: string | null;
  lastActivityAt: string;
  userAgent: string | null;
}

const webConfig = getWebConfig();

export default function SecuritySessionsPage() {
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSessions = async () => {
    try {
      setError(null);
      setIsLoading(true);

      const response = await fetchWithSession(`${webConfig.NEXT_PUBLIC_API_URL}/api/v1/sessions`);

      if (!response.ok) {
        throw new Error(`Falha ao carregar sessoes (${response.status})`);
      }

      const payload = (await response.json()) as { items: SessionItem[] };
      setSessions(payload.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar sessoes.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadSessions();
  }, []);

  const revokeSession = async (sessionId: string) => {
    await fetchWithSession(`${webConfig.NEXT_PUBLIC_API_URL}/api/v1/sessions/${sessionId}`, {
      method: "DELETE"
    });
    await loadSessions();
  };

  const logoutAll = async () => {
    await fetchWithSession(`${webConfig.NEXT_PUBLIC_API_URL}/api/v1/sessions/logout-all`, {
      method: "POST"
    });
    await loadSessions();
  };

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <header style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <div>
          <h1 style={{ margin: 0 }}>Sessoes ativas</h1>
          <p style={{ color: "var(--muted)", margin: "0.35rem 0 0" }}>
            Device, IP e ultima atividade com revogacao individual e global.
          </p>
        </div>
        <button onClick={() => void logoutAll()} type="button">
          Sign out from all devices
        </button>
      </header>

      {error ? <p style={{ color: "#a11d2d", margin: 0 }}>{error}</p> : null}
      {isLoading ? <p>Carregando...</p> : null}

      {!isLoading ? (
        <div style={{ border: "1px solid var(--border)", borderRadius: "1rem", overflow: "hidden" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th align="left" style={{ padding: "0.75rem" }}>
                  Device
                </th>
                <th align="left" style={{ padding: "0.75rem" }}>
                  IP
                </th>
                <th align="left" style={{ padding: "0.75rem" }}>
                  Ultima atividade
                </th>
                <th align="left" style={{ padding: "0.75rem" }}>
                  Acao
                </th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr key={session.id}>
                  <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>
                    {session.userAgent ?? "Desconhecido"}
                  </td>
                  <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>
                    {session.ipAddress ?? "N/A"}
                  </td>
                  <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>
                    {new Date(session.lastActivityAt).toLocaleString("pt-BR")}
                  </td>
                  <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>
                    <button onClick={() => void revokeSession(session.id)} type="button">
                      Revogar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

