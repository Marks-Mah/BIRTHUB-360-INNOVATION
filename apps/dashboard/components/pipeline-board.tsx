"use client";

import { useMemo, useState } from "react";
import { useMetrics } from "../lib/dashboard-hooks";
import type { PipelineItem } from "../lib/dashboard-types";

type Props = { pipeline: PipelineItem[] };

export function PipelineBoard({ pipeline }: Props) {
  const [search, setSearch] = useState("");
  const [minValue, setMinValue] = useState(0);

  const { data: metrics, loading, error } = useMetrics();

  const items = useMemo(
    () =>
      (metrics?.pipeline || []).filter(
        (item: { stage: string; value: number }) => item.stage.toLowerCase().includes(search.toLowerCase()) && item.value >= minValue,
      ),
    [search, minValue, pipeline],
  );

  if (loading) return <article className="card">Carregando métricas...</article>;
  if (error) return <article className="card">Erro ao carregar métricas.</article>;

  return (
    <article className="card">
      <label>
        Filtrar etapa
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ex: Negociação" />
      </label>
      <label>
        Valor mínimo
        <input type="number" value={minValue} onChange={(e) => setMinValue(Number(e.target.value || 0))} />
      </label>
      <ul className="list">
        {items.map((item: { stage: string; value: number; trend: string }) => (
          <li key={item.stage}>
            <span>{item.stage}</span>
            <strong>{item.value}</strong>
            <small>{item.trend}</small>
          </li>
        ))}
      </ul>
    </article>
  );
}
