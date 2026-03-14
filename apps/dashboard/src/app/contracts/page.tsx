import { getContracts } from "@/lib/data";
import clsx from "clsx";

export default async function ContractsPage() {
  const contracts = await getContracts();

  return (
    <div className="h-full flex flex-col space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Contract Management</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + Generate Contract
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="p-4 font-medium">Company</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Value</th>
              <th className="p-4 font-medium">Last Updated</th>
              <th className="p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {contracts.map((contract) => (
              <tr key={contract.id} className="hover:bg-slate-50">
                <td className="p-4 font-medium text-slate-900">{contract.deal.lead.company}</td>
                <td className="p-4 text-slate-600">{contract.type}</td>
                <td className="p-4">
                  <StatusBadge status={contract.status} />
                </td>
                <td className="p-4 text-slate-600">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: contract.deal.currency }).format(contract.deal.value)}
                </td>
                <td className="p-4 text-slate-500">{new Date(contract.updatedAt).toLocaleDateString()}</td>
                <td className="p-4">
                  <button className="text-blue-600 hover:text-blue-800 font-medium text-xs">View</button>
                </td>
              </tr>
            ))}
            {contracts.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-400 italic">No contracts found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    DRAFT: "bg-gray-100 text-gray-700",
    REVIEW: "bg-blue-100 text-blue-700",
    PENDING_SIGNATURE: "bg-yellow-100 text-yellow-700",
    SIGNED: "bg-green-100 text-green-700",
    ACTIVE: "bg-green-100 text-green-700",
    EXPIRED: "bg-red-100 text-red-700",
    TERMINATED: "bg-red-100 text-red-700",
  };

  const statusKey = status as keyof typeof styles;

  return (
    <span className={clsx("px-2.5 py-0.5 rounded-full text-xs font-medium", styles[statusKey] || "bg-gray-100 text-gray-700")}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
