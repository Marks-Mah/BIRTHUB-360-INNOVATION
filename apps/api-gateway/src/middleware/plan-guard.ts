import type { RequestHandler } from 'express';
import type { AuthRequest } from './auth.js';
import { resolveTenantId } from './tenant-context.js';

const planFeatures = new Map<string, Set<string>>([
  ['PRO', new Set(['ldr_agent', 'sdr_agent'])],
  ['ENTERPRISE', new Set(['ldr_agent', 'sdr_agent', 'ae_agent', 'analytics_advanced'])],
]);

type Plan = 'STARTER' | 'PRO' | 'ENTERPRISE';

function parsePlanFromEnv(tenantId: string): Plan | null {
  const raw = process.env.TENANT_PLAN_MAP;
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const plan = parsed[tenantId];
    if (plan === 'STARTER' || plan === 'PRO' || plan === 'ENTERPRISE') return plan;
    return null;
  } catch {
    return null;
  }
}

async function getOrganizationPlan(req: AuthRequest): Promise<Plan> {
  const tokenPlan = req.user && typeof req.user.plan === 'string' ? req.user.plan.toUpperCase() : null;
  if (tokenPlan === 'STARTER' || tokenPlan === 'PRO' || tokenPlan === 'ENTERPRISE') {
    return tokenPlan;
  }

  const tenantId = resolveTenantId(req);
  const mappedPlan = parsePlanFromEnv(tenantId);
  if (mappedPlan) return mappedPlan;

  return 'STARTER';
}

async function checkPlanFeature(plan: Plan, feature: string) {
  return planFeatures.get(plan)?.has(feature) ?? false;
}

export function requireFeature(feature: string): RequestHandler {
  return async (req, res, next) => {
    const plan = await getOrganizationPlan(req as AuthRequest);
    const allowed = await checkPlanFeature(plan, feature);
    if (!allowed) return res.status(402).json({ error: 'Upgrade required', feature });
    next();
  };
}
