"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Jan", mrr: 4000 },
  { name: "Feb", mrr: 3000 },
  { name: "Mar", mrr: 5000 },
];

export default function MetricsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Financial Metrics</h1>
      <div className="bg-white p-4 rounded shadow h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="mrr" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
