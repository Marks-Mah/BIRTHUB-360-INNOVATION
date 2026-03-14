import { AnalyticsBoard } from "../../components/analytics-board";
import { getDashboardSnapshot } from "../../lib/dashboard-data";

export default async function AnalyticsPage() {
  const { attribution } = await getDashboardSnapshot();

  return (
    <main className="container">
      <h1>Analytics & Attribution</h1>
      <AnalyticsBoard attribution={attribution} />
    </main>
  );
}
