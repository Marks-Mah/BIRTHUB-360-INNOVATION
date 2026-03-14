import { getCustomersWithHealth } from "@/lib/data";
import { HealthBoard } from "@/components/health-board";

export default async function CustomersPage() {
  const customers = await getCustomersWithHealth();

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Customer Health</h1>
        <div className="text-sm text-slate-500">
          Monitoring {customers.length} active accounts
        </div>
      </div>

      <HealthBoard customers={customers} />
    </div>
  );
}
