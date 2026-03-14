import Link from "next/link";
import { notFound } from "next/navigation";

import { AgentDetailTabs } from "../../../../components/agents/agent-detail-tabs";
import { getInstalledAgentById } from "../../../../lib/agents";

export default async function AgentDetailPage({ params }: Readonly<{ params: { id: string } }>) {
  const agent = await getInstalledAgentById(params.id);

  if (!agent) {
    notFound();
  }

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <header style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <div>
          <h2 style={{ margin: 0 }}>{agent.name}</h2>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            ID instalado: {agent.id} · catalogo: {agent.catalogAgentId}
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link href={`/agents/${agent.id}/run`}>Run</Link>
          <Link href={`/agents/${agent.id}/policies`}>Policies</Link>
        </div>
      </header>

      <AgentDetailTabs agent={agent} />
    </section>
  );
}
