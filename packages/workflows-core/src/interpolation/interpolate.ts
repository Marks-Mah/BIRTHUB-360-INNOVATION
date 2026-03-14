import type { WorkflowRuntimeContext } from "../types.js";

const TOKEN_PATTERN = /{{\s*([^{}]+)\s*}}/g;

function resolvePath(pathExpression: string, context: WorkflowRuntimeContext): unknown {
  const normalizedPath = pathExpression.replace(/^\$\./, "");
  const segments = normalizedPath.split(".").filter(Boolean);
  let cursor: unknown = context;

  for (const segment of segments) {
    if (typeof cursor !== "object" || cursor === null || !(segment in cursor)) {
      return undefined;
    }

    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return cursor;
}

export function interpolateTemplate(
  value: string,
  context: WorkflowRuntimeContext
): string {
  return value.replace(TOKEN_PATTERN, (_token, expression) => {
    const resolved = resolvePath(String(expression).trim(), context);
    if (resolved === undefined || resolved === null) {
      return "";
    }

    if (typeof resolved === "string") {
      return resolved;
    }

    return JSON.stringify(resolved);
  });
}

export function interpolateValue<T>(value: T, context: WorkflowRuntimeContext): T {
  if (typeof value === "string") {
    return interpolateTemplate(value, context) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => interpolateValue(item, context)) as T;
  }

  if (typeof value === "object" && value !== null) {
    const output: Record<string, unknown> = {};
    for (const [key, objectValue] of Object.entries(value as Record<string, unknown>)) {
      output[key] = interpolateValue(objectValue, context);
    }
    return output as T;
  }

  return value;
}

