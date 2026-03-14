import type { NextFunction, Request, Response } from "express";
import { resolveTenantId } from "./tenant-context.js";

type Plan = "starter" | "growth" | "enterprise";
type Bucket = { ts: number[] };

const PLAN_LIMITS: Record<Plan, number> = { starter: 30, growth: 90, enterprise: 240 };

export function createTenantRateLimitMiddleware(options?: { windowMs?: number; max?: number }) {
  const windowMs = options?.windowMs ?? 60_000;
  const fallbackMax = options?.max ?? 30;
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = resolveTenantId(req);
    const plan = (req.header("x-plan") ?? req.header("x-tenant-plan") ?? "starter") as Plan;
    const max = options?.max ?? PLAN_LIMITS[plan] ?? fallbackMax;
    const key = `${tenantId}:${plan}`;
    const now = Date.now();
    const bucket = buckets.get(key) ?? { ts: [] };

    bucket.ts = bucket.ts.filter((t) => now - t < windowMs);
    if (bucket.ts.length >= max) {
      buckets.set(key, bucket);
      return res.status(429).json({ error: { code: "RATE_LIMIT_EXCEEDED", message: "Tenant rate limit exceeded", details: { tenantId, max, windowMs } } });
    }

    bucket.ts.push(now);
    buckets.set(key, bucket);
    return next();
  };
}

export const tenantRateLimitMiddleware = createTenantRateLimitMiddleware();
