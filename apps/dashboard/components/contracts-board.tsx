"use client";

import { useMemo, useState } from "react";
import { useRecentTasks } from "../lib/dashboard-hooks";
import type { ContractItem } from "../lib/dashboard-types";

type Props = { contracts: ContractItem[] };

export function ContractsBoard({ contracts }: Props) {
  const [query, setQuery] = useState("");
  const { data, loading, error } = useRecentTasks();
  const rows = useMemo(
    () => (data?.contracts || []).filter((item: { customer: string }) => item.customer.toLowerCase().includes(query.toLowerCase())),
    [query, data],
  );

  if (loading) return <article className="card">Carregando contratos...</article>;
  if (error) return <article className="card">Erro ao carregar contratos.</article>;

  return (
    <article className="card">
      <label>
        Buscar contrato
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cliente" />
      </label>
      <ul className="list">
        {rows.map((item: { customer: string; mrr: string; status: string; owner: string }) => (
          <li key={item.customer}>
            <span>{item.customer}</span>
            <strong>{item.mrr}</strong>
            <small>{item.status} · {item.owner}</small>
          </li>
        ))}
      </ul>
    </article>
  );
}
