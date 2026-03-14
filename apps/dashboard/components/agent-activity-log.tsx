"use client";

import { useEffect, useMemo, useState } from "react";
import { hasSupabaseConfig, subscribeToSupabaseRealtime } from "../lib/supabase";

type AgentLogEntry = {
  id: string;
  agent: string;
  action: string;
  createdAt: string | number | Date;
};

const fallbackLogs: AgentLogEntry[] = [
  {
    id: "1",
    agent: "Agent SDR",
    action: "Enriqueceu 14 leads do segmento SaaS",
    createdAt: "há 2 min",
  },
  {
    id: "2",
    agent: "Agent CS",
    action: "Detectou risco de churn na conta Aurum Tech",
    createdAt: "há 6 min",
  },
  {
    id: "3",
    agent: "Agent Finance",
    action: "Atualizou previsão de MRR para próximo ciclo",
    createdAt: "há 11 min",
  },
];

export function AgentActivityLog() {
  const [entries, setEntries] = useState<AgentLogEntry[]>(fallbackLogs);

  const formatRelativeTime = (value: AgentLogEntry["createdAt"]) => {
    if (typeof value === "string" && value.startsWith("há ")) {
      return value;
    }

    const timestamp = value instanceof Date ? value.getTime() : new Date(value).getTime();

    if (Number.isNaN(timestamp)) {
      return "agora";
    }

    const minutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));

    if (minutes < 1) {
      return "agora";
    }

    if (minutes < 60) {
      return `há ${minutes} min`;
    }

    const hours = Math.round(minutes / 60);
    if (hours < 24) {
      return `há ${hours}h`;
    }

    const days = Math.round(hours / 24);
    return `há ${days}d`;
  };

  const sourceLabel = useMemo(
    () => (hasSupabaseConfig() ? "feed em tempo real" : "modo demo"),
    [],
  );

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      const demoActions = [
        "Reclassificou lead enterprise para alta prioridade",
        "Sincronizou oportunidade com CRM externo",
        "Gerou insight de churn para carteira SMB",
      ];

      const interval = setInterval(() => {
        setEntries((current) => {
          const next: AgentLogEntry = {
            id: crypto.randomUUID(),
            agent: "Agent Monitor",
            action: demoActions[Math.floor(Math.random() * demoActions.length)],
            createdAt: "agora",
          };
          return [next, ...current].slice(0, 8);
        });
      }, 20_000);

      return () => clearInterval(interval);
    }

    return subscribeToSupabaseRealtime({
      channelName: "agent-activity-log",
      table: "AgentLog",
      onInsert: (record) => {
        const next: AgentLogEntry = {
          id: String(record.id ?? crypto.randomUUID()),
          agent: String(record.agent_name ?? record.agentName ?? "Agent"),
          action: String(record.action ?? record.message ?? "Atividade registrada"),
          createdAt: String(record.created_at ?? record.createdAt ?? new Date().toISOString()),
        };

        setEntries((current) => [next, ...current].slice(0, 8));
      },
    });
  }, []);

  return (
    <div>
      <p className="muted">Origem: {sourceLabel}</p>
      <ul className="activity-list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <strong>{entry.agent}</strong>
            <span>{entry.action}</span>
            <small>{formatRelativeTime(entry.createdAt)}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
