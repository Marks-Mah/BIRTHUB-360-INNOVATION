import { createHmac } from "node:crypto";
export function validateJobContext(context) {
    return Boolean(context.actorId &&
        context.jobId &&
        context.tenantId &&
        context.scopedAt &&
        !Number.isNaN(Date.parse(context.scopedAt)));
}
export function signJobPayload(payload, secret) {
    return createHmac("sha256", secret).update(payload).digest("hex");
}
export function verifyJobPayloadSignature(payload, secret, signature) {
    return signJobPayload(payload, secret) === signature;
}
