import { interpolateValue } from "../interpolation/interpolate.js";
import type { WorkflowRuntimeContext } from "../types.js";

interface TransformerConfig {
  filter?: string | undefined;
  map?: Record<string, unknown> | undefined;
  sourcePath?: string | undefined;
}

function readSource(path: string | undefined, context: WorkflowRuntimeContext): unknown[] {
  if (!path) {
    return [];
  }

  const normalized = path.replace(/^\$\./, "");
  const segments = normalized.split(".").filter(Boolean);
  let cursor: unknown = context;

  for (const segment of segments) {
    if (typeof cursor !== "object" || cursor === null || !(segment in cursor)) {
      return [];
    }
    cursor = (cursor as Record<string, unknown>)[segment];
  }

  if (!Array.isArray(cursor)) {
    return [];
  }

  return cursor;
}

function shouldKeep(item: unknown, filter: string | undefined): boolean {
  if (!filter) {
    return true;
  }

  // Minimal and deterministic filter support to avoid arbitrary code execution.
  if (filter === "truthy") {
    return Boolean(item);
  }

  if (filter === "non-empty-object") {
    return typeof item === "object" && item !== null && Object.keys(item).length > 0;
  }

  return true;
}

export function executeTransformerNode(
  config: TransformerConfig,
  context: WorkflowRuntimeContext
): unknown[] {
  const source = readSource(config.sourcePath, context);
  const filtered = source.filter((item) => shouldKeep(item, config.filter));

  if (!config.map) {
    return filtered;
  }

  return filtered.map((_item) => interpolateValue(config.map!, context));
}

export type { TransformerConfig };
