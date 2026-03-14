import { createHmac } from "node:crypto";

export interface IJobContext {
  actorId: string;
  jobId: string;
  scopedAt: string;
  tenantId: string;
}

export function validateJobContext(context: IJobContext): boolean {
  return Boolean(
    context.actorId &&
      context.jobId &&
      context.tenantId &&
      context.scopedAt &&
      !Number.isNaN(Date.parse(context.scopedAt))
  );
}

export function signJobPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function verifyJobPayloadSignature(payload: string, secret: string, signature: string): boolean {
  return signJobPayload(payload, secret) === signature;
}
