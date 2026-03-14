import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { createClient } from "redis";
import { createClient as createDeepgramClient } from "@deepgram/sdk";
import { createLogger } from "@birthub/logger";

const requiredEnv = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "DEEPGRAM_API_KEY", "ELEVENLABS_API_KEY", "REDIS_URL"] as const;
for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required env: ${key}`);
  }
}

const logger = createLogger("voice-engine");

const app = express();
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws/calls" });
const redis = createClient({ url: process.env.REDIS_URL! });
const deepgram = createDeepgramClient(process.env.DEEPGRAM_API_KEY!);

async function publish(event: string, payload: Record<string, unknown>): Promise<void> {
  await redis.xAdd("voice_events", "*", {
    event,
    payload: JSON.stringify(payload),
    timestamp: new Date().toISOString(),
  });
}

function shouldClarify(sttConfidence: number): boolean {
  return sttConfidence < 0.7;
}

app.post("/twilio/inbound", async (req, res) => {
  const callId = String(req.body.CallSid || crypto.randomUUID());
  const optedOut = Boolean(req.body.optOut);
  await publish("call.started", { callId, optedOut });
  if (optedOut) {
    return res.type("text/xml").send("<Response><Say>You have opted out of call recording.</Say></Response>");
  }
  return res.type("text/xml").send("<Response><Say>Connected to AI voice engine.</Say></Response>");
});

wss.on("connection", (socket) => {
  let ttsActive = false;

  socket.on("message", async (raw) => {
    const start = Date.now();
    const frame = JSON.parse(raw.toString()) as { type: string; transcript?: string; confidence?: number; callId: string };

    if (frame.type === "transcript.chunk") {
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

      const llmOutput = `Entendi: ${frame.transcript}. Próximo passo recomendado enviado.`;
      ttsActive = true;
      socket.send(JSON.stringify({ type: "tts", text: llmOutput }));
      await publish("response.generated", { callId: frame.callId, latencyMs: Date.now() - start });
      ttsActive = false;
    }
  });

  socket.on("close", async () => {
    await publish("call.ended", { reason: "socket_closed" });
  });
});

app.get("/health", async (_req, res) => {
  res.json({ status: "ok", deepgram: Boolean(deepgram), redis: redis.isOpen });
});

async function bootstrap() {
  await redis.connect();
  const port = Number(process.env.PORT || 3012);
  server.listen(port, () => {
    logger.info({ port }, "voice-engine listening");
  });
}

bootstrap().catch((error) => {
  logger.error({ error }, "voice-engine bootstrap failed");
  process.exit(1);
});
