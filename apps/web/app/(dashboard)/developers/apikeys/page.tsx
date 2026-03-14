"use client";

import { useEffect, useState } from "react";

import { getWebConfig } from "@birthub/config";

import { fetchWithSession } from "../../../../lib/auth-client";

type ApiKeyScope = "agents:read" | "agents:write" | "workflows:trigger" | "webhooks:receive";

interface ApiKeyItem {
  createdAt: string;
  id: string;
  label: string;
  last4: string;
  scopes: ApiKeyScope[];
  status: "ACTIVE" | "REVOKED";
}

const allScopes: ApiKeyScope[] = [
  "agents:read",
  "agents:write",
  "workflows:trigger",
  "webhooks:receive"
];

const webConfig = getWebConfig();

export default function ApiKeysPage() {
  const [items, setItems] = useState<ApiKeyItem[]>([]);
  const [label, setLabel] = useState("Integration Key");
  const [scopes, setScopes] = useState<ApiKeyScope[]>(["agents:read"]);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    const response = await fetchWithSession(`${webConfig.NEXT_PUBLIC_API_URL}/api/v1/apikeys`);

    if (!response.ok) {
      setError(`Falha ao carregar API keys (${response.status})`);
      return;
    }

    const payload = (await response.json()) as { items: ApiKeyItem[] };
    setItems(payload.items);
  };

  useEffect(() => {
    void load();
  }, []);

  const createKey = async () => {
    setError(null);
    const response = await fetchWithSession(`${webConfig.NEXT_PUBLIC_API_URL}/api/v1/apikeys`, {
      body: JSON.stringify({ label, scopes }),
      headers: {
        "content-type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      setError(`Falha ao criar key (${response.status})`);
      return;
    }

    const payload = (await response.json()) as { apiKey: string };
    setCreatedKey(payload.apiKey);
    await load();
  };

  const rotateKey = async (id: string) => {
    await fetchWithSession(`${webConfig.NEXT_PUBLIC_API_URL}/api/v1/apikeys/${id}/rotate`, {
      method: "POST"
    });
    await load();
  };

  const revokeKey = async (id: string) => {
    await fetchWithSession(`${webConfig.NEXT_PUBLIC_API_URL}/api/v1/apikeys/${id}`, {
      method: "DELETE"
    });
    await load();
  };

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <header>
        <h1 style={{ margin: 0 }}>API Keys</h1>
        <p style={{ color: "var(--muted)", margin: "0.35rem 0 0" }}>
          Chaves prefixadas `bh360_live_` com criação, rotação (grace 24h) e revogação imediata.
        </p>
      </header>

      <article
        style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: "1rem",
          display: "grid",
          gap: "0.75rem",
          padding: "1rem"
        }}
      >
        <strong>Criar nova API key</strong>
        <input onChange={(event) => setLabel(event.target.value)} value={label} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {allScopes.map((scope) => (
            <label key={scope} style={{ alignItems: "center", display: "flex", gap: "0.35rem" }}>
              <input
                checked={scopes.includes(scope)}
                onChange={(event) =>
                  setScopes((current) =>
                    event.target.checked
                      ? [...current, scope]
                      : current.filter((currentScope) => currentScope !== scope)
                  )
                }
                type="checkbox"
              />
              {scope}
            </label>
          ))}
        </div>
        <button onClick={() => void createKey()} type="button">
          Criar key
        </button>
        {createdKey ? (
          <p style={{ margin: 0 }}>
            <strong>Exibida uma unica vez:</strong> <code>{createdKey}</code>
          </p>
        ) : null}
      </article>

      {error ? <p style={{ color: "#a11d2d", margin: 0 }}>{error}</p> : null}

      <div style={{ border: "1px solid var(--border)", borderRadius: "1rem", overflow: "hidden" }}>
        <table style={{ borderCollapse: "collapse", width: "100%" }}>
          <thead>
            <tr>
              <th align="left" style={{ padding: "0.75rem" }}>
                Label
              </th>
              <th align="left" style={{ padding: "0.75rem" }}>
                Ultimos 4
              </th>
              <th align="left" style={{ padding: "0.75rem" }}>
                Scopes
              </th>
              <th align="left" style={{ padding: "0.75rem" }}>
                Status
              </th>
              <th align="left" style={{ padding: "0.75rem" }}>
                Acoes
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>{item.label}</td>
                <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>{item.last4}</td>
                <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>
                  {item.scopes.join(", ")}
                </td>
                <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>{item.status}</td>
                <td style={{ borderTop: "1px solid var(--border)", padding: "0.75rem" }}>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button onClick={() => void rotateKey(item.id)} type="button">
                      Rotate
                    </button>
                    <button onClick={() => void revokeKey(item.id)} type="button">
                      Revoke
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

