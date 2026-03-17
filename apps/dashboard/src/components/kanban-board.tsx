"use client";

import { DealStage } from "@birthub/database";
import { useMemo } from "react";
import clsx from "clsx";

type Deal = {
  id: string;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  lead: {
    name: string;
    company: string;
  };
};

const STAGES: DealStage[] = [
  "PROSPECTING",
  "QUALIFICATION",
  "DEMO_SCHEDULED",
  "PROPOSAL_SENT",
  "NEGOTIATION",
  "CLOSED_WON",
  "CLOSED_LOST",
];

export function KanbanBoard({ deals }: { deals: Deal[] }) {
  const dealsByStage = useMemo(() => {
    // Inicializa o objeto com todas as stages como chaves
    const grouped: Record<string, Deal[]> = {};
    STAGES.forEach(stage => {
      grouped[stage] = [];
    });

    // Popula com os deals
    deals.forEach((deal) => {
      if (grouped[deal.stage]) {
        grouped[deal.stage].push(deal);
      }
    });
    return grouped;
  }, [deals]);

  return (
    <div className="flex gap-6 overflow-x-auto pb-8 h-[calc(100vh-12rem)] w-full">
      {STAGES.map((stage) => (
        <div key={stage} className="min-w-[300px] bg-slate-100 rounded-lg p-4 flex flex-col h-full shrink-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-slate-700 text-xs uppercase tracking-wide truncate pr-2" title={stage.replace(/_/g, " ")}>
              {stage.replace(/_/g, " ")}
            </h3>
            <span className="bg-slate-200 text-slate-600 text-xs font-medium px-2 py-0.5 rounded-full">
              {dealsByStage[stage]?.length || 0}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {dealsByStage[stage]?.length > 0 ? (
              dealsByStage[stage].map((deal) => (
                <div
                  key={deal.id}
                  className={clsx(
                    "bg-white p-3 rounded-md shadow-sm border border-slate-200 hover:shadow-md transition-shadow cursor-grab active:cursor-grabbing",
                    deal.stage === "CLOSED_WON" ? "border-l-4 border-l-green-500" :
                    deal.stage === "CLOSED_LOST" ? "border-l-4 border-l-red-500" :
                    "border-l-4 border-l-blue-500"
                  )}
                >
                  <div className="text-sm font-medium text-slate-900 truncate" title={deal.title}>{deal.title}</div>
                  <div className="text-xs text-slate-500 mt-1 truncate" title={deal.lead.company}>{deal.lead.company}</div>
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50">
                    <span className="font-bold text-slate-700 text-sm">
                      {new Intl.NumberFormat("pt-BR", { style: "currency", currency: deal.currency }).format(deal.value)}
                    </span>
                    <div className="h-6 w-6 rounded-full bg-slate-100 text-xs flex items-center justify-center text-slate-500 font-medium" title={deal.lead.name}>
                      {deal.lead.name.charAt(0).toUpperCase()}
                    </div>
                  </div>
                </div>
              ))
            ) : (
               <div className="flex flex-col items-center justify-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                 <span className="text-sm italic">Empty stage</span>
               </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
