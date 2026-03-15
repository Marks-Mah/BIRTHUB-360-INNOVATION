import assert from "node:assert/strict";
import test from "node:test";

import { WebSocket } from "ws";

type MockRedis = {
  connect: () => Promise<void>;
  disconnect: () => void;
  events: Array<Record<string, string>>;
  isOpen: boolean;
  quit: () => Promise<void>;
  xAdd: (stream: string, id: string, fields: Record<string, string>) => Promise<unknown>;
};

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

function createMockRedis(): MockRedis {
  const events: Array<Record<string, string>> = [];
  let open = false;

  return {
    connect: async () => {
      open = true;
    },
    disconnect: () => {
      open = false;
    },
    events,
    get isOpen() {
      return open;
    },
    quit: async () => {
      open = false;
    },
    xAdd: async (_stream, _id, fields) => {
      events.push(fields);
      return fields.timestamp;
    }
  };
}

function createEnv() {
  return {
    DEEPGRAM_API_KEY: "dg_test",
    ELEVENLABS_API_KEY: "eleven_test",
    PORT: "0",
    REDIS_URL: "redis://localhost:6379",
    TWILIO_ACCOUNT_SID: "twilio_sid",
    TWILIO_AUTH_TOKEN: "twilio_secret"
  };
}

void test("voice-engine validates required env before boot", async () => {
  process.env.BIRTHUB_DISABLE_VOICE_ENGINE_AUTOSTART = "1";
  const { readVoiceEngineEnv } = await import("./server.js");

  assert.throws(() => {
    readVoiceEngineEnv({ REDIS_URL: "redis://localhost:6379" });
  }, /Missing required env: TWILIO_ACCOUNT_SID/);
});

void test("voice-engine health and websocket handshake publish runtime events", async () => {
  process.env.BIRTHUB_DISABLE_VOICE_ENGINE_AUTOSTART = "1";
  const { createVoiceEngineRuntime } = await import("./server.js");
  const redis = createMockRedis();
  const runtime = createVoiceEngineRuntime({
    deepgramFactory: () => ({ ready: true }),
    env: createEnv(),
    logger: {
      error: () => undefined,
      info: () => undefined
    },
    redisClient: redis
  });

  const port = await runtime.start();
  let socket: WebSocket | undefined;

  try {
    const healthResponse = await fetch(`http://127.0.0.1:${port}/health`);
    const healthPayload = await healthResponse.json();

    assert.equal(healthResponse.status, 200);
    assert.equal(healthPayload.status, "ok");
    assert.equal(healthPayload.redis, true);

    socket = new WebSocket(`ws://127.0.0.1:${port}/ws/calls`);
    await new Promise<void>((resolve, reject) => {
      socket?.once("open", () => resolve());
      socket?.once("error", (error) => reject(error));
    });

    const messagePromise = new Promise<Record<string, unknown>>((resolve, reject) => {
      socket?.once("message", (raw) => {
        try {
          resolve(JSON.parse(decodeSocketPayload(raw)) as Record<string, unknown>);
        } catch (error) {
          reject(error instanceof Error ? error : new Error(String(error)));
        }
      });
      socket?.once("error", (error) => reject(error));
    });

    socket.send(
      JSON.stringify({
        callId: "call_01",
        confidence: 0.95,
        transcript: "Confirmar proximo passo",
        type: "transcript.chunk"
      })
    );

    const message = await messagePromise;
    assert.equal(message.type, "tts");
    assert.match(typeof message.text === "string" ? message.text : "", /Entendi: Confirmar proximo passo/);
    assert.ok(redis.events.some((entry) => entry.event === "transcript.chunk"));
    assert.ok(redis.events.some((entry) => entry.event === "response.generated"));
  } finally {
    socket?.close();
    await runtime.stop();
  }
});
