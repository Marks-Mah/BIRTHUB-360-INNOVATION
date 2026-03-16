"use client";

import { useMemo, useState } from "react";
import { useRecentTasks } from "../lib/dashboard-hooks";
import type { AttributionItem } from "../lib/dashboard-types";

type Props = { attribution: AttributionItem[] };

export function AnalyticsBoard({ attribution }: Props) {
  const [minLeads, setMinLeads] = useState(0);
  const { data, loading, error } = useRecentTasks();
  const rows = useMemo(() => (data?.attribution || []).filter((item: { leads: number }) => item.leads >= minLeads), [minLeads, data]);

  if (loading) return <article className="card">Carregando atividades...</article>;
  if (error) return <article className="card">Erro ao carregar atividades.</article>;

  return (
    <article className="card">
      <label>
        Leads mínimos
        <input type="number" value={minLeads} onChange={(e) => setMinLeads(Number(e.target.value || 0))} />
      </label>
      <ul className="list">
        {rows.map((item: { source: string; leads: number; conversion: string; cac: string }) => (
          <li key={item.source}>
            <span>{item.source}</span>
            <strong>{item.leads} leads</strong>
            <small>conv {item.conversion} · CAC {item.cac}</small>
          </li>
        ))}
      </ul>
    </article>
  );
}
