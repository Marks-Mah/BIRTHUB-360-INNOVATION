import { type Prisma, prisma } from "@birthub/database";

const auditBuffer: Prisma.AuditLogCreateManyInput[] = [];

export function bufferAuditEvent(event: Prisma.AuditLogCreateManyInput): void {
  auditBuffer.push(event);
}

export async function flushBufferedAuditEvents(): Promise<number> {
  if (auditBuffer.length === 0) {
    return 0;
  }

  const batch = auditBuffer.splice(0, 100);

  await prisma.auditLog.createMany({
    data: batch
  });

  return batch.length;
}
