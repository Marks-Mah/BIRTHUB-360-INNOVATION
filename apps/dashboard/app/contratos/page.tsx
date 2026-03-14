import { ContractsBoard } from "../../components/contracts-board";
import { getDashboardSnapshot } from "../../lib/dashboard-data";

export default async function ContratosPage() {
  const { contracts } = await getDashboardSnapshot();

  return (
    <main className="container">
      <h1>Gestão de Contratos</h1>
      <ContractsBoard contracts={contracts} />
    </main>
  );
}
