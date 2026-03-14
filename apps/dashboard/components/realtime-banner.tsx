"use client";

import { useEffect, useState } from "react";
import { hasSupabaseConfig, subscribeToSupabaseRealtime, type RealtimeStatus } from "../lib/supabase";

function normalizeLabel(status: RealtimeStatus | "demo" | "updated") {
  const labels: Record<RealtimeStatus | "demo" | "updated", string> = {
    connecting: "Conectando",
    connected: "Conectado",
    reconnecting: "Reconectando",
    closed: "Fechado",
    error: "Erro",
    demo: "Demo",
    updated: "Atualizado",
  };

  return labels[status];
}

export function RealtimeBanner() {
  const [status, setStatus] = useState<RealtimeStatus | "demo" | "updated">("closed");

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      setStatus("demo");
      return;
    }

    return subscribeToSupabaseRealtime({
      channelName: "agent-log-feed",
      table: "AgentLog",
      onStatus: setStatus,
      onAnyChange: () => setStatus("updated"),
    });
  }, []);

  return (
    <div className="card status-card" aria-live="polite">
      <span>Supabase Realtime</span>
      <strong>{normalizeLabel(status)}</strong>
    </div>
  );
}
