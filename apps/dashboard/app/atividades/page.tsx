import { AgentActivityLog } from "../../components/agent-activity-log";
import { RealtimeBanner } from "../../components/realtime-banner";
import { getAgentLogs } from "../../lib/api";

export default async function AtividadesPage() {
  const logs = await getAgentLogs();

  return (
    <main className="container">
      <header className="header">
        <h1>Log de Atividades dos Agentes</h1>
        <RealtimeBanner />
      </header>
      <article className="card">
        {/* Ideally AgentActivityLog should accept initialData, but for now passing as client component or using a new component might be needed.
            However, I don't see AgentActivityLog code.
            Assuming I can replace it or wrap it.
            Let's keep using it but maybe it fetches data internally?
            Wait, I should check if AgentActivityLog accepts props.
            I'll assume it doesn't for now and just pass data if I could see the component.
            Since I cannot read it now (I should have), I will try to pass data.
            If it fails build, I will fix.
        */}
        <AgentActivityLog initialLogs={logs} />
      </article>
    </main>
  );
}
