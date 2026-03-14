import { QueueManager } from "../src";
import { QUEUE_CONFIG } from "../src/definitions";

async function main() {
  const manager = new QueueManager();
  const recurringQueues = Object.entries(QUEUE_CONFIG).filter(([, cfg]) => !!cfg.cron);

  try {
    await manager.scheduleRecurringJobs();
    console.log(
      `✅ ${recurringQueues.length} jobs recorrentes configurados: ${recurringQueues
        .map(([queue]) => queue)
        .join(", ")}`,
    );
  } finally {
    await manager.close();
  }
}

main().catch((error) => {
  console.error("❌ Falha ao configurar jobs recorrentes:", error);
  process.exit(1);
});
