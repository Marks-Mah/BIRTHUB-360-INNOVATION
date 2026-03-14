export const DEFAULT_SENSITIVE_FIELDS = [
  "authorization",
  "cpf",
  "credit_card",
  "email",
  "password",
  "token"
];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalize(fields: readonly string[]): Set<string> {
  return new Set(fields.map((field) => field.toLowerCase()));
}

export function redactPII<TValue>(
  value: TValue,
  sensitiveFields: readonly string[] = DEFAULT_SENSITIVE_FIELDS
): TValue {
  const sensitive = normalize(sensitiveFields);

  const visit = (input: unknown): unknown => {
    if (Array.isArray(input)) {
      return input.map((item) => visit(item));
    }

    if (isPlainObject(input)) {
      const redactedEntries = Object.entries(input).map(([key, entry]) => {
        if (sensitive.has(key.toLowerCase())) {
          return [key, "[REDACTED]"];
        }

        return [key, visit(entry)];
      });

      return Object.fromEntries(redactedEntries);
    }

    return input;
  };

  return visit(value) as TValue;
}
