import { z, type ZodTypeAny } from "zod";

export const nodeEnvSchema = z.enum(["development", "test", "production"]).default("development");

export const nonEmptyString = z.string().trim().min(1);
export const optionalNonEmptyString = z
  .string()
  .trim()
  .min(1)
  .optional();

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
export const optionalUrlString = z.string().url().optional();

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
