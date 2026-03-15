import { createServer } from "node:http";

import { createLogger } from "@birthub/logger";
import express from "express";
import { createClient } from "redis";
import { WebSocketServer } from "ws";

export type VoiceEngineEnv = {
  DEEPGRAM_API_KEY: string;
  ELEVENLABS_API_KEY: string;
  PORT: number;
  REDIS_URL: string;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
};

type RedisClientLike = {
  connect: () => Promise<void>;
  disconnect?: () => void;
  isOpen: boolean;
  quit?: () => Promise<void>;
  xAdd: (
    stream: string,
    id: string,
    fields: Record<string, string>
  ) => Promise<unknown>;
};

type LoggerLike = {
  error: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
};

type DeepgramFactory = (apiKey: string) => unknown;

function decodeSocketPayload(raw: unknown): string {
  if (typeof raw === "string") {
    return raw;
  }

  if (Buffer.isBuffer(raw)) {
    return raw.toString("utf8");
  }

  if (raw instanceof ArrayBuffer) {
    return Buffer.from(raw).toString("utf8");
  }

  if (Array.isArray(raw)) {
    return Buffer.concat(raw.filter((chunk) => Buffer.isBuffer(chunk))).toString("utf8");
  }

  throw new Error("Unsupported websocket payload");
}

export function readVoiceEngineEnv(env: NodeJS.ProcessEnv = process.env): VoiceEngineEnv {
  const requiredKeys = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "DEEPGRAM_API_KEY",
    "ELEVENLABS_API_KEY",
    "REDIS_URL"
  ] as const;

  const values = Object.fromEntries(
    requiredKeys.map((key) => {
      const value = env[key]?.trim();
      if (!value) {
        throw new Error(`Missing required env: ${key}`);
      }

      return [key, value];
    })
  ) as Omit<VoiceEngineEnv, "PORT">;

  const port = Number(env.PORT ?? "3012");
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${env.PORT ?? ""}`);
  }

  return {
    ...values,
    PORT: port
  };
}

export function createVoiceEngineRuntime(options: {
  deepgramFactory?: DeepgramFactory;
  env?: NodeJS.ProcessEnv;
  logger?: LoggerLike;
  redisClient?: RedisClientLike;
} = {}) {
  const env = readVoiceEngineEnv(options.env);
  const logger = options.logger ?? createLogger("voice-engine");
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws/calls" });
  const redis =
    options.redisClient ??
    (createClient({
      url: env.REDIS_URL
    }) as unknown as RedisClientLike);
  const deepgram = (options.deepgramFactory ?? ((apiKey: string) => ({ apiKey })))(env.DEEPGRAM_API_KEY);

  async function publish(event: string, payload: Record<string, unknown>): Promise<void> {
    await redis.xAdd("voice_events", "*", {
      event,
      payload: JSON.stringify(payload),
      timestamp: new Date().toISOString()
    });
  }

  function shouldClarify(sttConfidence: number): boolean {
    return sttConfidence < 0.7;
  }

  app.use(express.json());

  app.post("/twilio/inbound", async (req, res) => {
    const callId = String(req.body.CallSid || crypto.randomUUID());
    const optedOut = Boolean(req.body.optOut);
    await publish("call.started", { callId, optedOut });
    if (optedOut) {
      return res
        .type("text/xml")
        .send("<Response><Say>You have opted out of call recording.</Say></Response>");
    }
    return res.type("text/xml").send("<Response><Say>Connected to AI voice engine.</Say></Response>");
  });

  wss.on("connection", (socket) => {
    let ttsActive = false;

    socket.on("message", async (raw) => {
      const start = Date.now();
      const frame = JSON.parse(decodeSocketPayload(raw)) as {
        callId: string;
        confidence?: number;
        transcript?: string;
        type: string;
      };

      if (frame.type !== "transcript.chunk") {
        return;
      }

      await publish("transcript.chunk", frame);
      if (ttsActive) {
        ttsActive = false;
        await publish("response.interrupted", { callId: frame.callId });
      }

      if (shouldClarify(frame.confidence ?? 0)) {
        socket.send(JSON.stringify({ type: "tts", text: "Desculpe, pode repetir com mais clareza?" }));
        await publish("response.generated", { callId: frame.callId, fallback: true });
        return;
      }

      const llmOutput = `Entendi: ${frame.transcript}. Proximo passo recomendado enviado.`;
      ttsActive = true;
      socket.send(JSON.stringify({ type: "tts", text: llmOutput }));
      await publish("response.generated", { callId: frame.callId, latencyMs: Date.now() - start });
      ttsActive = false;
    });

    socket.on("close", async () => {
      await publish("call.ended", { reason: "socket_closed" });
    });
  });

  app.get("/health", async (_req, res) => {
    res.json({ deepgram: Boolean(deepgram), redis: redis.isOpen, status: "ok" });
  });

  async function start(): Promise<number> {
    if (!redis.isOpen) {
      await redis.connect();
    }

    await new Promise<void>((resolve) => {
      server.listen(env.PORT, () => resolve());
    });

    const address = server.address();
    const port = typeof address === "object" && address ? address.port : env.PORT;
    logger.info({ port }, "voice-engine listening");
    return port;
  }

  async function stop(): Promise<void> {
    await new Promise<void>((resolve) => {
      wss.close(() => resolve());
    });
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });

    if (redis.isOpen) {
      if (typeof redis.quit === "function") {
        await redis.quit();
      } else if (typeof redis.disconnect === "function") {
        redis.disconnect();
      }
    }
  }

  return {
    app,
    publish,
    server,
    start,
    stop
  };
}

if (
  process.env.NODE_ENV !== "test" &&
  process.env.BIRTHUB_DISABLE_VOICE_ENGINE_AUTOSTART !== "1"
) {
  const runtime = createVoiceEngineRuntime();
  runtime.start().catch((error) => {
    const logger = createLogger("voice-engine");
    logger.error({ error }, "voice-engine bootstrap failed");
    process.exit(1);
  });
}
