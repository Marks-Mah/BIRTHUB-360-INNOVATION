import { getDealsByStage } from "@/lib/data";
import { KanbanBoard } from "@/components/kanban-board";

export default async function DealsPage() {
  const deals = await getDealsByStage();

  // Mapear os dados para o formato esperado pelo KanbanBoard
  const formattedDeals = deals.map(deal => ({
    id: deal.id,
    title: deal.title,
    value: deal.value,
    currency: deal.currency,
    stage: deal.stage,
    lead: {
      name: deal.lead.name,
      company: deal.lead.company,
    }
  }));

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Sales Pipeline</h1>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          + New Deal
        </button>
      </div>

      <KanbanBoard deals={formattedDeals} />
    </div>
  );
}
