import { getAgentLogs } from "@/lib/data";
import clsx from "clsx";

export default async function LogsPage() {
  const logs = await getAgentLogs();

  return (
    <div className="h-full flex flex-col space-y-8">
      <h1 className="text-2xl font-bold text-slate-800">Agent Activity Log</h1>

      <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
            <tr>
              <th className="p-4 font-medium">Timestamp</th>
              <th className="p-4 font-medium">Agent</th>
              <th className="p-4 font-medium">Action</th>
              <th className="p-4 font-medium">Status</th>
              <th className="p-4 font-medium">Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="p-4 text-slate-500 font-mono text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                <td className="p-4 font-medium text-blue-600">{log.agentName}</td>
                <td className="p-4 text-slate-700">{log.action}</td>
                <td className="p-4">
                  <span className={clsx(
                    "px-2 py-0.5 rounded text-xs font-bold",
                    log.error ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                  )}>
                    {log.error ? "ERROR" : "SUCCESS"}
                  </span>
                </td>
                <td className="p-4 text-slate-500 text-xs">{log.durationMs ? `${log.durationMs}ms` : "-"}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-400 italic">No logs found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
