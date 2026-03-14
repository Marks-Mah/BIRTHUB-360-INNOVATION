import { getFinancialMetrics } from "@/lib/data";

export default async function FinancePage() {
  const data = await getFinancialMetrics();

  return (
    <div className="h-full flex flex-col space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Financial Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard title="Total MRR" value={`$${data.mrr.toLocaleString()}`} color="blue" />
        <MetricCard title="Churn Risk Count" value={data.churnCount.toString()} color="red" />
        <MetricCard title="Overdue Invoices" value={data.overdueInvoices.length.toString()} color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 text-slate-700">Revenue History (Last 6 Months)</h2>
          <div className="h-64 flex items-end justify-between space-x-2">
            {data.revenueHistory.length > 0 ? (
              data.revenueHistory.map((item) => (
                <div key={item.date} className="flex flex-col items-center flex-1">
                  <div
                    className="w-full bg-blue-500 rounded-t opacity-80 hover:opacity-100 transition-opacity"
                    style={{ height: `${Math.min((item.amount / 50000) * 100, 100)}%` }} // Scaling helper
                  ></div>
                  <span className="text-xs text-slate-500 mt-2">{item.date}</span>
                </div>
              ))
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-400 italic">
                No revenue data available
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <h2 className="text-lg font-semibold mb-4 text-slate-700">Overdue Invoices</h2>
          <div className="overflow-y-auto max-h-64">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="p-2">Customer</th>
                  <th className="p-2">Amount</th>
                  <th className="p-2">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {data.overdueInvoices.length > 0 ? (
                  data.overdueInvoices.map((inv) => (
                    <tr key={inv.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-2 font-medium">{inv.customer.organization.name}</td>
                      <td className="p-2 text-red-600 font-bold">${inv.amount.toLocaleString()}</td>
                      <td className="p-2 text-slate-500">{new Date(inv.dueDate).toLocaleDateString()}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-400">No overdue invoices</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, color }: { title: string; value: string; color: "blue" | "red" | "yellow" }) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    red: "bg-red-50 border-red-200 text-red-700",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-700",
  };

  return (
    <div className={`p-6 rounded-lg border ${colors[color]}`}>
      <h3 className="text-sm font-medium uppercase tracking-wide opacity-80">{title}</h3>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
}
