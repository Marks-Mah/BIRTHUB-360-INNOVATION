import { getDashboardStats } from "@/lib/data";
import { Suspense } from "react";

export default async function Page() {
  const stats = await getDashboardStats();

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8 text-slate-800">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard title="Total Leads" value={stats.leadsCount} />
        <StatCard title="Active Deals" value={stats.dealsCount} />
        <StatCard title="Customers" value={stats.customersCount} />
        <StatCard title="MRR" value={`$${stats.mrr.toLocaleString()}`} />
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4 text-slate-700">Recent Agent Activity</h2>
        <div className="space-y-4">
          {stats.recentActivity.length === 0 ? (
            <p className="text-gray-500">No recent activity found.</p>
          ) : (
            stats.recentActivity.map((log) => (
              <div key={log.id} className="border-b pb-4 last:border-0 last:pb-0">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium text-blue-600">{log.agentName}</span>
                    <span className="text-gray-600 mx-2">•</span>
                    <span className="text-gray-800">{log.action}</span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString()}
                  </span>
                </div>
                {log.error && (
                   <p className="text-red-500 text-sm mt-1">Error: {log.error}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
      <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</h3>
      <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
