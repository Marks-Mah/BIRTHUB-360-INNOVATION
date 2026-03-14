import net from "node:net";
import { QueueManager } from "../src/index";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

function parseRedisTarget(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname,
    port: Number(parsed.port || 6379),
  };
}

async function checkRedisAvailable(url: string): Promise<boolean> {
  const { host, port } = parseRedisTarget(url);

  return new Promise((resolve) => {
    const socket = new net.Socket();

    socket.setTimeout(1200);

    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });

    socket.once("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.once("error", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function run() {
  const redisAvailable = await checkRedisAvailable(REDIS_URL);
  if (!redisAvailable) {
    console.error(
      "Redis indisponível para teste de carga. Configure REDIS_URL ou suba Redis local em localhost:6379.",
    );
    process.exit(1);
  }

  const queueName = "load-test-queue";
  const manager = new QueueManager(REDIS_URL);
  const queue = manager.createQueue(queueName);

  let processed = 0;
  const worker = manager.createWorker(queueName, async () => {
    processed += 1;
    return { ok: true };
  });

  const total = 100;
  for (let i = 0; i < total; i += 1) {
    await queue.add(`job-${i}`, { i });
  }

  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Load test timeout")),
      15_000,
    );
    const interval = setInterval(() => {
      if (processed >= total) {
        clearTimeout(timeout);
        clearInterval(interval);
        resolve(true);
      }
    }, 100);
  });

  console.log(`Processed ${processed}/${total}`);
  await worker.close();
  await queue.close();
  await manager.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
