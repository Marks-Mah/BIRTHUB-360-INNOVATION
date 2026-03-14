const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export type RealtimeStatus =
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed"
  | "error";

type RealtimeEventType = "INSERT" | "UPDATE" | "DELETE";

type RealtimeConfig = {
  channelName: string;
  table: string;
  schema?: string;
  maxReconnectAttempts?: number;
  onStatus?: (status: RealtimeStatus) => void;
  onInsert?: (payload: Record<string, unknown>) => void;
  onAnyChange?: () => void;
};

function getRealtimeWebsocketUrl() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  const realtimeBase = supabaseUrl.replace(/^http/, "ws").replace(/\/$/, "");
  return `${realtimeBase}/realtime/v1/websocket?apikey=${supabaseAnonKey}&vsn=1.0.0`;
}

function readPostgresChange(message: unknown) {
  const data = message as {
    event?: string;
    payload?: {
      ids?: number[];
      data?: {
        record?: Record<string, unknown>;
        type?: RealtimeEventType;
      };
    };
  };

  if (data.event !== "postgres_changes") {
    return null;
  }

  return {
    type: data.payload?.data?.type,
    record: data.payload?.data?.record ?? {},
  };
}

export function hasSupabaseConfig() {
  return Boolean(getRealtimeWebsocketUrl());
}

export function subscribeToSupabaseRealtime(config: RealtimeConfig) {
  const socketUrl = getRealtimeWebsocketUrl();

  if (!socketUrl || typeof window === "undefined") {
    return () => undefined;
  }

  const schema = config.schema ?? "public";
  const maxReconnectAttempts = config.maxReconnectAttempts ?? 5;
  const topic = `realtime:${schema}:${config.table}`;

  let disposed = false;
  let reconnectAttempts = 0;
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  let socket: WebSocket | null = null;

  const clearHeartbeat = () => {
    if (!heartbeatTimer) {
      return;
    }

    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  };

  const buildRef = () => `${config.channelName}-${Date.now()}`;

  const connect = () => {
    if (disposed) {
      return;
    }

    config.onStatus?.(reconnectAttempts > 0 ? "reconnecting" : "connecting");

    socket = new WebSocket(socketUrl);

    socket.onopen = () => {
      reconnectAttempts = 0;

      socket?.send(
        JSON.stringify({
          topic,
          event: "phx_join",
          payload: {
            config: {
              broadcast: { self: false },
              presence: { key: "dashboard" },
              postgres_changes: [
                {
                  event: "*",
                  schema,
                  table: config.table,
                },
              ],
            },
          },
          ref: buildRef(),
        }),
      );

      heartbeatTimer = setInterval(() => {
        socket?.send(
          JSON.stringify({
            topic: "phoenix",
            event: "heartbeat",
            payload: {},
            ref: buildRef(),
          }),
        );
      }, 30000);
    };

    socket.onmessage = (message) => {
      const data = JSON.parse(String(message.data)) as {
        event?: string;
        payload?: { status?: string };
      };

      if (data.event === "phx_reply" && data.payload?.status === "ok") {
        config.onStatus?.("connected");
      }

      const change = readPostgresChange(data);

      if (!change) {
        return;
      }

      config.onAnyChange?.();

      if (change.type === "INSERT") {
        config.onInsert?.(change.record);
      }
    };

    socket.onerror = () => {
      config.onStatus?.("error");
    };

    socket.onclose = () => {
      clearHeartbeat();

      if (disposed) {
        config.onStatus?.("closed");
        return;
      }

      if (reconnectAttempts >= maxReconnectAttempts) {
        config.onStatus?.("closed");
        return;
      }

      reconnectAttempts += 1;
      setTimeout(connect, reconnectAttempts * 1000);
    };
  };

  connect();

  return () => {
    disposed = true;
    clearHeartbeat();
    socket?.close();
  };
}
