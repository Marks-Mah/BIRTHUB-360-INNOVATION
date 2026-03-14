"use client";

import { useEffect, useMemo, useState } from "react";

import { fetchWithSession, getStoredSession } from "../../../../../lib/auth-client";

type WebhookEndpoint = {
  _count?: {
    deliveries: number;
  };
  createdAt: string;
  id: string;
  secret: string;
  status: "ACTIVE" | "DISABLED";
  topics: string[];
  url: string;
};

type WebhookDelivery = {
  attempt: number;
  createdAt: string;
  endpointId: string;
  id: string;
  responseStatus: number | null;
  topic: string;
};

const suggestedTopics = [
  "agent.finished",
  "agent.failed",
  "workflow.finished",
  "tenant.churn_risk"
];

export default function DeveloperWebhooksPage() {
  const session = useMemo(() => getStoredSession(), []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [topics, setTopics] = useState("agent.finished,agent.failed");
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadEndpoints() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchWithSession("/api/v1/settings/webhooks", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Falha ao carregar endpoints (${response.status}).`);
      }

      const payload = (await response.json()) as {
        items: WebhookEndpoint[];
      };
      const items = payload.items ?? [];

      setEndpoints(items);
      setSelectedId((current) => current ?? items[0]?.id ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar endpoints.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDeliveries(endpointId: string) {
    try {
      const response = await fetchWithSession(
        `/api/v1/settings/webhooks/${encodeURIComponent(endpointId)}/deliveries?limit=25`,
        {
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(`Falha ao carregar entregas (${response.status}).`);
      }

      const payload = (await response.json()) as {
        items: WebhookDelivery[];
      };

      setDeliveries(payload.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Falha ao carregar entregas.");
    }
  }

  useEffect(() => {
    if (!session) {
      return;
    }

    void loadEndpoints();
  }, [session]);

  useEffect(() => {
    if (!selectedId) {
      setDeliveries([]);
      return;
    }

    void loadDeliveries(selectedId);
  }, [selectedId]);

  if (!session) {
    return (
      <main style={{ padding: "1.5rem" }}>
        <div className="panel">
          <h1 style={{ marginTop: 0 }}>Webhooks outbound</h1>
          <p>Realize login como administrador para cadastrar endpoints assinados.</p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ display: "grid", gap: "1rem", padding: "1.5rem" }}>
      <section className="hero-card">
        <span className="badge">Developer Settings</span>
        <h1>Webhooks outbound assinados</h1>
        <p style={{ marginBottom: 0 }}>
          Cadastre endpoints por tenant, acompanhe historico de entrega e reenvie cargas com o payload exato.
        </p>
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
            <h2 style={{ marginTop: 0 }}>Novo endpoint</h2>
            <p style={{ color: "var(--muted)", marginBottom: 0 }}>
              Tente com {suggestedTopics.join(", ")} para cobrir eventos de engajamento.
            </p>
          </div>
          <button
            className="ghost-button"
            onClick={() => {
              void loadEndpoints();
            }}
            type="button"
          >
            Recarregar
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gap: "0.75rem",
            gridTemplateColumns: "2fr 1.4fr auto"
          }}
        >
          <input
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://cliente.example.com/webhooks/birthhub"
            type="url"
            value={url}
          />
          <input
            onChange={(event) => setTopics(event.target.value)}
            placeholder="agent.finished,agent.failed"
            type="text"
            value={topics}
          />
          <button
            className="action-button"
            disabled={saving || !url.trim()}
            onClick={() => {
              const parsedTopics = topics
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean);

              setSaving(true);
              setError(null);

              void fetchWithSession("/api/v1/settings/webhooks", {
                body: JSON.stringify({
                  topics: parsedTopics,
                  url
                }),
                headers: {
                  "content-type": "application/json"
                },
                method: "POST"
              })
                .then(async (response) => {
                  if (!response.ok) {
                    throw new Error(`Falha ao criar endpoint (${response.status}).`);
                  }

                  const payload = (await response.json()) as {
                    endpoint: WebhookEndpoint;
                  };

                  setUrl("");
                  setTopics("agent.finished,agent.failed");
                  setEndpoints((current) => [payload.endpoint, ...current]);
                  setSelectedId(payload.endpoint.id);
                })
                .catch((saveError) => {
                  setError(
                    saveError instanceof Error ? saveError.message : "Falha ao criar endpoint."
                  );
                })
                .finally(() => {
                  setSaving(false);
                });
            }}
            type="button"
          >
            Criar endpoint
          </button>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gap: "1rem",
          gridTemplateColumns: "minmax(320px, 1.1fr) minmax(340px, 1fr)"
        }}
      >
        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Endpoints cadastrados</h2>

          {loading ? <p>Carregando endpoints...</p> : null}

          <div style={{ display: "grid", gap: "0.75rem" }}>
            {endpoints.map((endpoint) => (
              <article
                key={endpoint.id}
                style={{
                  background:
                    selectedId === endpoint.id
                      ? "rgba(19,93,102,0.08)"
                      : "rgba(255,255,255,0.7)",
                  border: "1px solid var(--border)",
                  borderRadius: 18,
                  display: "grid",
                  gap: "0.45rem",
                  padding: "0.9rem"
                }}
              >
                <div
                  style={{
                    alignItems: "center",
                    display: "flex",
                    gap: "0.65rem",
                    justifyContent: "space-between"
                  }}
                >
                  <strong>{endpoint.url}</strong>
                  <span
                    className={`status-pill ${
                      endpoint.status === "ACTIVE" ? "status-green" : "status-red"
                    }`}
                  >
                    {endpoint.status}
                  </span>
                </div>
                <small style={{ color: "var(--muted)" }}>
                  Topicos: {endpoint.topics.join(", ")}
                </small>
                <small style={{ color: "var(--muted)" }}>
                  Secret: {endpoint.secret.slice(0, 6)}...{endpoint.secret.slice(-6)}
                </small>
                <small style={{ color: "var(--muted)" }}>
                  Deliveries: {endpoint._count?.deliveries ?? 0}
                </small>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
                  <button
                    className="ghost-button"
                    onClick={() => {
                      setSelectedId(endpoint.id);
                    }}
                    type="button"
                  >
                    Ver historico
                  </button>
                  <button
                    className={
                      endpoint.status === "ACTIVE" ? "danger-button" : "action-button"
                    }
                    onClick={() => {
                      void fetchWithSession(
                        `/api/v1/settings/webhooks/${encodeURIComponent(endpoint.id)}`,
                        {
                          body: JSON.stringify({
                            status: endpoint.status === "ACTIVE" ? "DISABLED" : "ACTIVE"
                          }),
                          headers: {
                            "content-type": "application/json"
                          },
                          method: "PATCH"
                        }
                      )
                        .then(async (response) => {
                          if (!response.ok) {
                            throw new Error(`Falha ao atualizar endpoint (${response.status}).`);
                          }

                          const payload = (await response.json()) as {
                            endpoint: WebhookEndpoint;
                          };

                          setEndpoints((current) =>
                            current.map((item) =>
                              item.id === payload.endpoint.id ? payload.endpoint : item
                            )
                          );
                        })
                        .catch((saveError) => {
                          setError(
                            saveError instanceof Error
                              ? saveError.message
                              : "Falha ao atualizar endpoint."
                          );
                        });
                    }}
                    type="button"
                  >
                    {endpoint.status === "ACTIVE" ? "Desativar" : "Reativar"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <h2 style={{ marginTop: 0 }}>Historico de entregas</h2>
          {selectedId ? (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Topico</th>
                    <th>Status</th>
                    <th>Tentativa</th>
                    <th>Acao</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveries.length === 0 ? (
                    <tr>
                      <td colSpan={5}>Nenhuma entrega registrada ainda.</td>
                    </tr>
                  ) : (
                    deliveries.map((delivery) => (
                      <tr key={delivery.id}>
                        <td>{new Date(delivery.createdAt).toLocaleString("pt-BR")}</td>
                        <td>{delivery.topic}</td>
                        <td>{delivery.responseStatus ?? "PENDENTE"}</td>
                        <td>{delivery.attempt}</td>
                        <td>
                          <button
                            className="ghost-button"
                            onClick={() => {
                              void fetchWithSession(
                                `/api/v1/settings/webhooks/deliveries/${encodeURIComponent(delivery.id)}/retry`,
                                {
                                  method: "POST"
                                }
                              )
                                .then((response) => {
                                  if (!response.ok) {
                                    throw new Error(
                                      `Falha ao reenviar delivery (${response.status}).`
                                    );
                                  }

                                  return loadDeliveries(delivery.endpointId);
                                })
                                .catch((retryError) => {
                                  setError(
                                    retryError instanceof Error
                                      ? retryError.message
                                      : "Falha ao reenviar delivery."
                                  );
                                });
                            }}
                            type="button"
                          >
                            Reenviar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <p>Selecione um endpoint para ver o historico.</p>
          )}
        </div>
      </section>

      {error ? <p style={{ color: "#9b2f2f", margin: 0 }}>{error}</p> : null}
    </main>
  );
}

