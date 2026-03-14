import { TenantLiveFeed } from "../../../components/tenant-live-feed";

export default function AgentsMonitorPage() {
  return (
    <main className="container">
      <h1>Agents Monitor</h1>
      <article className="card">
        <p>Status por agente, jobs em execução e latência operacional.</p>
        <TenantLiveFeed />
      </article>
    </main>
  );
}
