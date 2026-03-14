import Link from "next/link";

export function Sidebar() {
  return (
    <div className="w-64 h-screen bg-gray-900 text-white p-4 fixed left-0 top-0">
      <h1 className="text-xl font-bold mb-8">BirtHub 360</h1>
      <nav className="flex flex-col space-y-4">
        <Link href="/dashboard/pipeline" className="hover:text-blue-400">Pipeline</Link>
        <Link href="/dashboard/metrics" className="hover:text-blue-400">Metrics</Link>
        <Link href="/dashboard/logs" className="hover:text-blue-400">Agent Logs</Link>
        <Link href="/dashboard/chat" className="hover:text-blue-400">Chat Assistant</Link>
      </nav>
    </div>
  );
}
