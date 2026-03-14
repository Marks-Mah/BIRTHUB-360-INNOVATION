"use client";

import { useEffect, useMemo, useState } from "react";

type EventMessage = { ts: string; message: string };

export function TenantLiveFeed() {
  const [events, setEvents] = useState<EventMessage[]>([]);
  const wsUrl = useMemo(() => process.env.NEXT_PUBLIC_TENANT_WS_URL, []);

  useEffect(() => {
    if (!wsUrl) return;
    const socket = new WebSocket(wsUrl);

    socket.onmessage = (event) => {
      setEvents((prev) => [{ ts: new Date().toISOString(), message: String(event.data) }, ...prev].slice(0, 20));
    };

    return () => socket.close();
  }, [wsUrl]);

  return (
    <ul className="list">
      {events.length === 0 ? <li><span>Sem eventos em tempo real.</span></li> : null}
      {events.map((event, index) => <li key={`${event.ts}-${index}`}><span>{event.message}</span><small>{event.ts}</small></li>)}
    </ul>
  );
}
