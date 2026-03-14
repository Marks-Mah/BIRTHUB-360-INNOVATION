import { type Prisma, prisma } from "@birthub/database";

const FLUSH_INTERVAL_MS = 5_000;
const MAX_BATCH_SIZE = 100;

const auditBuffer: Prisma.AuditLogCreateManyInput[] = [];

let flushInterval: NodeJS.Timeout | undefined;

export function ensureAuditFlushLoop(): void {
  if (flushInterval) {
    return;
  }

  flushInterval = setInterval(() => {
    void flushAuditBuffer();
  }, FLUSH_INTERVAL_MS);

  flushInterval.unref?.();
}

export function enqueueAuditEvent(event: Prisma.AuditLogCreateManyInput): void {
  ensureAuditFlushLoop();
  auditBuffer.push(event);

  if (auditBuffer.length >= MAX_BATCH_SIZE) {
    void flushAuditBuffer();
  }
}

export function getAuditBufferSize(): number {
  return auditBuffer.length;
}

export async function flushAuditBuffer(): Promise<number> {
  const batch = auditBuffer.splice(0, MAX_BATCH_SIZE);

  if (batch.length === 0) {
    return 0;
  }

  await prisma.auditLog.createMany({
    data: batch
  });

  return batch.length;
}
