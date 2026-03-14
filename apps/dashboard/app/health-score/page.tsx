import { HealthScoreBoard } from "../../components/health-score-board";
import { getDashboardSnapshot } from "../../lib/dashboard-data";

export default async function HealthScorePage() {
  const { healthScore } = await getDashboardSnapshot();

  return (
    <main className="container">
      <h1>Health Score Board</h1>
      <HealthScoreBoard healthScore={healthScore} />
    </main>
  );
}
