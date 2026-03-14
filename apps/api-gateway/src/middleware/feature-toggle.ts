import type { RequestHandler } from "express";
import { errorResponse } from "../errors/http-error.js";
import { resolveTenantId } from "./tenant-context.js";

interface FeatureStore {
  getFeature(tenantId: string, featureName: string): Promise<boolean | null>;
}

class InMemoryFeatureStore implements FeatureStore {
  private readonly flags = new Map<string, boolean>();

  async getFeature(tenantId: string, featureName: string): Promise<boolean | null> {
    const key = `${tenantId}:${featureName}`;
    return this.flags.has(key) ? this.flags.get(key)! : null;
  }
}

interface FeatureToggleOptions {
  featureName: string;
  envVar?: string;
  store?: FeatureStore;
}

function normalizeFlag(value: string | undefined): boolean {
  if (!value) return false;
  return ["1", "true", "yes", "on", "enabled"].includes(value.trim().toLowerCase());
}

export function featureToggleMiddleware(options: FeatureToggleOptions): RequestHandler {
  const envVar = options.envVar ?? `FEATURE_${options.featureName.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_ENABLED`;
  const store = options.store ?? new InMemoryFeatureStore();

  return async (req, res, next) => {
    const tenantId = resolveTenantId(req);
    const tenantOverride = await store.getFeature(tenantId, options.featureName);
    const enabled = tenantOverride ?? normalizeFlag(process.env[envVar]);

    if (!enabled) {
      const response = errorResponse(404, "FEATURE_DISABLED", `Feature '${options.featureName}' is disabled`, { feature: options.featureName });
      return res.status(response.status).json(response.body);
    }

    return next();
  };
}
