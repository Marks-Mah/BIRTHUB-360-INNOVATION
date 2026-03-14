import { ProblemDetailsError } from "./problem-details.js";

export function readFirstString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.find((entry): entry is string => typeof entry === "string");
  }

  return undefined;
}

export function readTrimmedString(value: unknown): string | undefined {
  const normalized = readFirstString(value)?.trim();
  return normalized && normalized.length > 0 ? normalized : undefined;
}

export function requireStringValue(value: unknown, detail: string): string {
  const normalized = readTrimmedString(value);

  if (normalized) {
    return normalized;
  }

  throw new ProblemDetailsError({
    detail,
    status: 400,
    title: "Bad Request"
  });
}
