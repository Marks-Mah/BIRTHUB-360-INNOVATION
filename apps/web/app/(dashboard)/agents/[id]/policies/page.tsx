import { notFound } from "next/navigation";

import { getInstalledAgentById } from "../../../../../lib/agents";

type ManifestPolicy = {
  actions: string[];
  effect: string;
  id: string;
  name: string;
};

function readPolicies(manifest: Record<string, unknown>): ManifestPolicy[] {
  const policies = manifest.policies;

  if (!Array.isArray(policies)) {
    return [];
  }

  return policies.filter((policy): policy is ManifestPolicy => {
    if (!policy || typeof policy !== "object") {
      return false;
    }

    const candidate = policy as Record<string, unknown>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.name === "string" &&
      typeof candidate.effect === "string" &&
      Array.isArray(candidate.actions)
    );
  });
}

export default async function AgentPoliciesPage({ params }: Readonly<{ params: { id: string } }>) {
  const agent = await getInstalledAgentById(params.id);

  if (!agent) {
    notFound();
  }

  const policies = readPolicies(agent.manifest);

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <header>
        <h2 style={{ margin: 0 }}>Policies</h2>
        <p style={{ color: "var(--muted)", marginBottom: 0 }}>
          Politicas reais e somente leitura publicadas no manifesto oficial do agente instalado.
        </p>
      </header>

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
        {policies.map((policy) => (
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

        {policies.length === 0 ? (
          <p style={{ color: "var(--muted)", margin: 0 }}>
            Nenhuma policy estruturada foi encontrada no manifesto deste agente.
          </p>
        ) : null}
      </div>
    </section>
  );
}
