import type { Request, Response, NextFunction } from "express";

type IdempotencyEntry = { expiresAt: number };

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function webhookIdempotencyMiddleware(options?: {
  ttlMs?: number;
  headerCandidates?: string[];
  getNow?: () => number;
}) {
  const ttlMs = options?.ttlMs ?? DEFAULT_TTL_MS;
  const getNow = options?.getNow ?? (() => Date.now());
  const headerCandidates = options?.headerCandidates ?? ["x-idempotency-key"];
  const processedKeys = new Map<string, IdempotencyEntry>();

  return function webhookIdempotency(req: Request, res: Response, next: NextFunction) {
    const rawKey =
      headerCandidates.map((name) => req.header(name)).find((value) => Boolean(value)) ?? undefined;
    if (!rawKey) return next();

    const now = getNow();
    for (const [key, value] of processedKeys.entries()) {
      if (value.expiresAt <= now) processedKeys.delete(key);
    }

    const key = rawKey.trim();
    if (!key) return next();
    if (processedKeys.has(key)) {
      return res.status(409).json({
        error: { code: "WEBHOOK_DUPLICATE_EVENT", message: "Webhook already processed" },
      });
    }

    processedKeys.set(key, { expiresAt: now + ttlMs });
    return next();
  };
}

export const createWebhookIdempotencyMiddleware = webhookIdempotencyMiddleware;
