export default function LogsPage() {
  const logs = [
    { id: 1, agent: "LDR", action: "Score Lead", status: "Success", timestamp: "10:00 AM" },
    { id: 2, agent: "SDR", action: "Send Email", status: "Success", timestamp: "10:05 AM" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Agent Activity Logs</h1>
      <table className="min-w-full bg-white rounded shadow">
        <thead>
          <tr className="border-b">
            <th className="p-3 text-left">Agent</th>
            <th className="p-3 text-left">Action</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Time</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id} className="border-b hover:bg-gray-50">
              <td className="p-3">{log.agent}</td>
              <td className="p-3">{log.action}</td>
              <td className="p-3 text-green-600">{log.status}</td>
              <td className="p-3">{log.timestamp}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
