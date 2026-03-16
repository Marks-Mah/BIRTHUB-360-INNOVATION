"use client";

import { useState, useTransition } from "react";

type ManifestPolicy = {
  actions: string[];
  effect: string;
  id: string;
  name: string;
};

type ManagedPolicy = {
  actions: string[];
  effect: "allow" | "deny";
  enabled?: boolean;
  id: string;
  name: string;
  reason?: string;
};

export function PolicyManager({
  agentId,
  apiUrl,
  initialManagedPolicies,
  initialManifestPolicies,
  runtimeProvider
}: Readonly<{
  agentId: string;
  apiUrl: string;
  initialManagedPolicies: ManagedPolicy[];
  initialManifestPolicies: ManifestPolicy[];
  runtimeProvider: string;
}>) {
  const [managedPolicies, setManagedPolicies] = useState(initialManagedPolicies);
  const [name, setName] = useState("");
  const [actions, setActions] = useState("tool:execute");
  const [effect, setEffect] = useState<"allow" | "deny">("allow");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function postJson<T>(path: string, method: "PATCH" | "POST", body: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${apiUrl}${path}`, {
      body: JSON.stringify(body),
      credentials: "include",
      headers: {
        "content-type": "application/json"
      },
      method
    });

    if (!response.ok) {
      throw new Error(`Falha ao salvar policy (${response.status}).`);
    }

    return (await response.json()) as T;
  }

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
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
        <div>
          <h2 style={{ margin: 0 }}>Policies</h2>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            Runtime ativo: <strong>{runtimeProvider}</strong>. Policies do manifesto continuam visiveis e as managed policies abaixo passam a governar o runtime instalado.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {(["standard", "readonly", "admin"] as const).map((template) => (
            <button
              key={template}
              disabled={isPending}
              onClick={() => {
                setError(null);
                startTransition(() => {
                  void (async () => {
                    try {
                      const payload = await postJson<{ managedPolicies: ManagedPolicy[] }>(
                        `/api/v1/agents/installed/${agentId}/policies/templates`,
                        "POST",
                        {
                          replaceExisting: false,
                          template
                        }
                      );
                      setManagedPolicies(payload.managedPolicies);
                    } catch (templateError) {
                      setError(
                        templateError instanceof Error
                          ? templateError.message
                          : "Falha ao aplicar template."
                      );
                    }
                  })();
                });
              }}
              type="button"
            >
              Aplicar template {template}
            </button>
          ))}
        </div>
      </div>

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
        <h3 style={{ margin: 0 }}>Managed Policies</h3>
        {managedPolicies.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Nenhuma managed policy criada ainda.
          </p>
        ) : null}
        {managedPolicies.map((policy) => (
          <article
            key={policy.id}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              display: "grid",
              gap: "0.45rem",
              padding: "0.75rem"
            }}
          >
            <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
              <strong>{policy.name}</strong>
              <button
                disabled={isPending}
                onClick={() => {
                  setError(null);
                  startTransition(() => {
                    void (async () => {
                      try {
                        const payload = await postJson<{ policy: ManagedPolicy }>(
                          `/api/v1/agents/installed/${agentId}/policies/${policy.id}`,
                          "PATCH",
                          {
                            enabled: !(policy.enabled ?? true)
                          }
                        );
                        setManagedPolicies((current) =>
                          current.map((item) => (item.id === policy.id ? payload.policy : item))
                        );
                      } catch (toggleError) {
                        setError(
                          toggleError instanceof Error
                            ? toggleError.message
                            : "Falha ao atualizar policy."
                        );
                      }
                    })();
                  });
                }}
                type="button"
              >
                {(policy.enabled ?? true) ? "Desativar" : "Ativar"}
              </button>
            </div>
            <small style={{ color: "var(--muted)" }}>{policy.id}</small>
            <p style={{ margin: 0 }}>
              <strong>{policy.effect}</strong> · {policy.actions.join(", ")}
            </p>
            {policy.reason ? <p style={{ margin: 0 }}>{policy.reason}</p> : null}
          </article>
        ))}
      </div>

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
        <h3 style={{ margin: 0 }}>Nova Managed Policy</h3>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Nome</span>
          <input onChange={(event) => setName(event.target.value)} value={name} />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Acoes (separadas por virgula)</span>
          <input onChange={(event) => setActions(event.target.value)} value={actions} />
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Efeito</span>
          <select onChange={(event) => setEffect(event.target.value as "allow" | "deny")} value={effect}>
            <option value="allow">allow</option>
            <option value="deny">deny</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: "0.35rem" }}>
          <span>Motivo</span>
          <textarea onChange={(event) => setReason(event.target.value)} rows={4} value={reason} />
        </label>
        <button
          disabled={isPending || name.trim().length === 0}
          onClick={() => {
            setError(null);
            startTransition(() => {
              void (async () => {
                try {
                  const payload = await postJson<{ policy: ManagedPolicy }>(
                    `/api/v1/agents/installed/${agentId}/policies`,
                    "POST",
                    {
                      actions: actions
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
                      effect,
                      name,
                      ...(reason.trim() ? { reason } : {})
                    }
                  );
                  setManagedPolicies((current) => [...current, payload.policy]);
                  setName("");
                  setActions("tool:execute");
                  setEffect("allow");
                  setReason("");
                } catch (createError) {
                  setError(
                    createError instanceof Error
                      ? createError.message
                      : "Falha ao criar policy."
                  );
                }
              })();
            });
          }}
          type="button"
        >
          {isPending ? "Salvando..." : "Criar policy"}
        </button>
        {error ? <small style={{ color: "#9d0208" }}>{error}</small> : null}
      </div>

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
        <h3 style={{ margin: 0 }}>Policies do Manifesto</h3>
        {initialManifestPolicies.map((policy) => (
          <article
            key={policy.id}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "0.75rem",
              display: "grid",
              gap: "0.45rem",
              padding: "0.75rem"
            }}
          >
            <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
              <strong>{policy.name}</strong>
              <span>{policy.effect}</span>
            </div>
            <small style={{ color: "var(--muted)" }}>{policy.id}</small>
            <p style={{ margin: 0 }}>Acoes permitidas: {policy.actions.join(", ")}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
