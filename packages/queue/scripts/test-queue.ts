import { QueueManager } from "../src/index";
import { QueueName } from "@birthub/shared-types";
import { Job } from "bullmq";

async function main() {
  const manager = new QueueManager();
  const queueName = QueueName.LEAD_ENRICHMENT;
  const queue = manager.createQueue(queueName);

  const processed: string[] = [];
  const worker = manager.createWorker(queueName, async (job: Job) => {
    processed.push(String(job.id));
    return { ok: true, data: job.data };
  });

  const job = await queue.add(
    "test-job",
    { foo: "bar" },
    { removeOnComplete: true },
  );
  await new Promise((resolve) => setTimeout(resolve, 1200));

  await manager.scheduleRecurringJobs();

  if (!processed.includes(String(job.id))) {
    throw new Error("Queue worker did not process the test job.");
  }

  await worker.close();
  await queue.close();
  await manager.close();
  console.log("Queue test finished.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
