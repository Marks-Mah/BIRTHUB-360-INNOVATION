import { PipelineBoard } from "../../components/pipeline-board";
import { getDashboardSnapshot } from "../../lib/dashboard-data";

export default async function PipelinePage() {
  const { pipeline } = await getDashboardSnapshot();

  return (
    <main className="container">
      <h1>Pipeline de Vendas</h1>
      <PipelineBoard pipeline={pipeline} />
    </main>
  );
}
