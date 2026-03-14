import { notFound } from "next/navigation";

import { getWebConfig } from "@birthub/config";

import { AgentRunPanel } from "../../../../../components/agents/agent-run-panel";
import { getInstalledAgentById } from "../../../../../lib/agents";

export default async function AgentRunPage({ params }: Readonly<{ params: { id: string } }>) {
  const agent = await getInstalledAgentById(params.id);

  if (!agent) {
    notFound();
  }

  const config = getWebConfig();

  return (
    <section style={{ display: "grid", gap: "1rem" }}>
      <header>
        <h2 style={{ margin: 0 }}>Run Agent</h2>
        <p style={{ color: "var(--muted)", marginBottom: 0 }}>
          Dry-run seguro com logs persistidos, replay SSE curto e publicacao de aprendizado compartilhado.
        </p>
      </header>
      <AgentRunPanel agentId={agent.id} apiUrl={config.NEXT_PUBLIC_API_URL} />
    </section>
  );
}
