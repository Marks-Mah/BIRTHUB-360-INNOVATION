import { getAnalyticsMetrics } from "@/lib/data";

export default async function AnalyticsPage() {
  const data = await getAnalyticsMetrics();
  const totalLeads = data.leadsBySource.reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="h-full flex flex-col space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Analytics & Attribution</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Lead Source Attribution */}
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <h2 className="text-lg font-semibold mb-6 text-slate-700">Lead Source Attribution</h2>
          <div className="space-y-4">
            {data.leadsBySource.map((item) => (
              <div key={item.source}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-slate-700">{item.source}</span>
                  <span className="text-slate-500">{item.count} leads ({((item.count / totalLeads) * 100).toFixed(1)}%)</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${(item.count / totalLeads) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {data.leadsBySource.length === 0 && (
              <div className="text-center text-slate-400 italic">No lead data</div>
            )}
          </div>
        </div>

        {/* Win/Loss Analysis */}
        <div className="bg-white p-6 rounded-lg shadow border border-slate-200">
          <h2 className="text-lg font-semibold mb-6 text-slate-700">Win/Loss Ratio</h2>
          <div className="flex flex-col items-center justify-center h-64">
            <div className="relative h-40 w-40 rounded-full border-8 border-slate-100 flex items-center justify-center">
               <div className="text-center">
                 <span className="block text-3xl font-bold text-slate-800">{data.winRate.toFixed(1)}%</span>
                 <span className="text-xs text-slate-500 uppercase tracking-wide">Win Rate</span>
               </div>
            </div>
            <div className="flex gap-8 mt-8">
              <div className="text-center">
                <span className="block text-2xl font-bold text-green-600">{data.dealsWon}</span>
                <span className="text-xs text-slate-500">Won</span>
              </div>
              <div className="text-center">
                <span className="block text-2xl font-bold text-red-600">{data.dealsLost}</span>
                <span className="text-xs text-slate-500">Lost</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
