"use client";

import clsx from "clsx";

type Customer = {
  id: string;
  organization: {
    name: string;
  };
  healthScore: number;
  healthStatus: string;
  mrr: number;
  churnRisk: number;
};

export function HealthBoard({ customers }: { customers: Customer[] }) {
  const healthy = customers.filter((c) => c.healthScore >= 70);
  const atRisk = customers.filter((c) => c.healthScore >= 30 && c.healthScore < 70);
  const churning = customers.filter((c) => c.healthScore < 30);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      <HealthColumn title="Healthy (>70)" customers={healthy} color="green" />
      <HealthColumn title="At Risk (30-70)" customers={atRisk} color="yellow" />
      <HealthColumn title="Churn Risk (<30)" customers={churning} color="red" />
    </div>
  );
}

function HealthColumn({
  title,
  customers,
  color
}: {
  title: string;
  customers: Customer[];
  color: "green" | "yellow" | "red";
}) {
  return (
    <div className="bg-slate-50 rounded-lg p-4 flex flex-col h-full border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold text-slate-700">{title}</h3>
        <span className="bg-white border border-slate-200 text-slate-600 text-xs px-2 py-1 rounded-full">
          {customers.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {customers.map((c) => (
          <div
            key={c.id}
            className={clsx(
              "bg-white p-4 rounded shadow-sm border-l-4 transition-all hover:shadow-md",
              color === "green" && "border-l-green-500",
              color === "yellow" && "border-l-yellow-500",
              color === "red" && "border-l-red-500"
            )}
          >
            <div className="flex justify-between items-start">
              <div className="font-medium text-slate-900">{c.organization.name}</div>
              <div className={clsx(
                "text-xs font-bold px-1.5 py-0.5 rounded",
                c.healthScore >= 70 ? "bg-green-100 text-green-700" :
                c.healthScore >= 30 ? "bg-yellow-100 text-yellow-700" :
                "bg-red-100 text-red-700"
              )}>
                {c.healthScore}
              </div>
            </div>

            <div className="flex justify-between items-center mt-4 text-sm">
              <span className="text-slate-500">MRR: <span className="font-medium text-slate-700">${c.mrr.toLocaleString()}</span></span>
              {c.churnRisk > 0 && (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  Risk: {(c.churnRisk * 100).toFixed(0)}%
                </span>
              )}
            </div>
          </div>
        ))}
        {customers.length === 0 && (
          <div className="text-center py-8 text-slate-400 italic">No customers</div>
        )}
      </div>
    </div>
  );
}
