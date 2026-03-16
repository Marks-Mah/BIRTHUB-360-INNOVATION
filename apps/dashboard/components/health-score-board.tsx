"use client";

import { useMemo, useState } from "react";
import { useAgentStatuses } from "../lib/dashboard-hooks";
import type { HealthScoreItem } from "../lib/dashboard-types";

type Props = { healthScore: HealthScoreItem[] };

export function HealthScoreBoard({ healthScore }: Props) {
  const [risk, setRisk] = useState("todos");
  const { data, loading, error } = useAgentStatuses();
  const filtered = useMemo(
    () => (data?.healthScore || []).filter((item: { risk: string }) => risk === "todos" || item.risk === risk),
    [risk, data],
  );

  if (loading) return <article className="card">Carregando status dos agentes...</article>;
  if (error) return <article className="card">Erro ao carregar status dos agentes.</article>;

  return (
    <article className="card">
      <label>
        Risco
        <select value={risk} onChange={(e) => setRisk(e.target.value)}>
          <option value="todos">Todos</option>
          <option value="baixo">Baixo</option>
          <option value="médio">Médio</option>
          <option value="alto">Alto</option>
        </select>
      </label>
      <ul className="list">
        {filtered.map((item: { client: string; score: number; risk: string; nps: number }) => (
          <li key={item.client}>
            <span>{item.client}</span>
            <strong>{item.score}</strong>
            <small>risco {item.risk} · NPS {item.nps}</small>
          </li>
        ))}
      </ul>
    </article>
  );
}
