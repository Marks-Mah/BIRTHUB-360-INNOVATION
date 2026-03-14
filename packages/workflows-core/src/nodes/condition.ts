import { interpolateValue } from "../interpolation/interpolate.js";
import type { WorkflowRuntimeContext } from "../types.js";

interface ConditionNodeConfig {
  operator: "!=" | "<" | "<=" | "==" | ">" | ">=";
  path: string;
  value: boolean | number | string;
}

function readPath(pathExpression: string, context: WorkflowRuntimeContext): unknown {
  const normalized = pathExpression.replace(/^\$\./, "");
  const segments = normalized.split(".").filter(Boolean);
  let cursor: unknown = context;

  for (const segment of segments) {
    if (typeof cursor !== "object" || cursor === null || !(segment in cursor)) {
      return undefined;
    }

    cursor = (cursor as Record<string, unknown>)[segment];
  }

  return cursor;
}

export function executeConditionNode(
  config: ConditionNodeConfig,
  context: WorkflowRuntimeContext
): {
  expected: boolean | number | string;
  operator: ConditionNodeConfig["operator"];
  result: boolean;
  value: unknown;
} {
  const interpolated = interpolateValue(config, context);
  const value = readPath(interpolated.path, context);
  const expected = interpolated.value;

  const result = (() => {
    switch (interpolated.operator) {
      case "==":
        return value === expected;
      case "!=":
        return value !== expected;
      case ">":
        return Number(value) > Number(expected);
      case ">=":
        return Number(value) >= Number(expected);
      case "<":
        return Number(value) < Number(expected);
      case "<=":
        return Number(value) <= Number(expected);
      default:
        return false;
    }
  })();

  return {
    expected,
    operator: interpolated.operator,
    result,
    value
  };
}

export type { ConditionNodeConfig };

