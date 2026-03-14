export type PlanFeature =
  | "advancedAnalytics"
  | "agents"
  | "customerPortal"
  | "prioritySupport"
  | "workflows";

type JsonRecord = Record<string, unknown>;

function asRecord(input: unknown): JsonRecord {
  if (typeof input !== "object" || !input || Array.isArray(input)) {
    return {};
  }

  return input as JsonRecord;
}

export function readNumericPlanLimit(limits: unknown, key: string, fallback: number): number {
  const value = asRecord(limits)[key];

  if (typeof value !== "number") {
    return fallback;
  }

  if (value < 0) {
    return Number.POSITIVE_INFINITY;
  }

  return value;
}

export function isPlanFeatureEnabled(limits: unknown, feature: PlanFeature): boolean {
  const features = asRecord(asRecord(limits).features);
  const value = features[feature];

  if (typeof value === "boolean") {
    return value;
  }

  return readNumericPlanLimit(limits, feature, 0) > 0;
}
