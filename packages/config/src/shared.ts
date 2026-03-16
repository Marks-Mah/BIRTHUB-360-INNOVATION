import { z, type ZodTypeAny } from "zod";

export const nodeEnvSchema = z.enum(["development", "test", "production"]).default("development");
export const deploymentEnvironmentSchema = z
  .enum(["development", "test", "staging", "production", "ci", "ci-local"])
  .default("development");
function emptyStringToUndefined(value: unknown): unknown {
  return typeof value === "string" && value.trim() === "" ? undefined : value;
}

export const nonEmptyString = z.string().trim().min(1);
export const optionalNonEmptyString = z.preprocess(
  emptyStringToUndefined,
  z
    .string()
    .trim()
    .min(1)
    .optional()
);
export const envBoolean = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }

    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }

  return value;
}, z.boolean());

export const commaSeparatedList = z
  .string()
  .default("")
  .transform((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
  );

export const urlString = z.string().url();
export const optionalUrlString = z.preprocess(
  emptyStringToUndefined,
  z.string().url().optional()
);

function safeParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isLocalHostname(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isLocalUrl(value: string): boolean {
  const parsed = safeParseUrl(value);
  return parsed ? isLocalHostname(parsed.hostname) : false;
}

export function isSecureHttpUrl(value: string): boolean {
  const parsed = safeParseUrl(value);
  return parsed?.protocol === "https:";
}

export function hasPlaceholderMarker(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return ["replace", "placeholder", "changeme", "todo"].some((token) =>
    normalized.includes(token)
  );
}

export function isStripeTestSecretKey(value: string): boolean {
  return value.trim().startsWith("sk_test_");
}

export function hasRequiredPostgresSsl(value: string): boolean {
  const parsed = safeParseUrl(value);
  if (!parsed) {
    return false;
  }

  const sslmode = parsed.searchParams.get("sslmode");
  return sslmode === "require" || sslmode === "verify-ca" || sslmode === "verify-full";
}

export function hasRequiredRedisTls(value: string): boolean {
  const parsed = safeParseUrl(value);
  if (!parsed) {
    return false;
  }

  return (
    parsed.protocol === "rediss:" ||
    parsed.searchParams.get("tls") === "true" ||
    parsed.searchParams.get("ssl") === "true"
  );
}

export class EnvValidationError extends Error {
  constructor(scope: string, issues: string[]) {
    super(`[${scope}] invalid environment variables:\n${issues.map((issue) => `- ${issue}`).join("\n")}`);
    this.name = "EnvValidationError";
  }
}

export function parseEnv<TSchema extends ZodTypeAny>(
  scope: string,
  schema: TSchema,
  env: NodeJS.ProcessEnv
): z.infer<TSchema> {
  const parsed = schema.safeParse(env);

  if (!parsed.success) {
    throw new EnvValidationError(
      scope,
      parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    );
  }

  return parsed.data;
}
