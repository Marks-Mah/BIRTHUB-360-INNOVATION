import type { Server as HttpServer } from "node:http";

export function attachRealtimeHub(_server: HttpServer) {
  return {
    broadcast: (topic: string, payload: unknown) => {
      console.info(JSON.stringify({ event: "realtime.broadcast", topic, payload }));
    },
  };
}
