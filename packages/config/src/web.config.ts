import { z } from "zod";

import {
  EnvValidationError,
  isLocalUrl,
  isSecureHttpUrl,
  nodeEnvSchema,
  optionalNonEmptyString,
  optionalUrlString,
  parseEnv,
  urlString
} from "./shared.js";

export const webEnvSchema = z.object({
  CSP_REPORT_URI: optionalUrlString,
  NEXTAUTH_SECRET: optionalNonEmptyString,
  NEXT_PUBLIC_API_URL: urlString.default("http://localhost:3000"),
  NEXT_PUBLIC_APP_URL: urlString.default("http://localhost:3001"),
  NEXT_PUBLIC_CSP_REPORT_ONLY: z.coerce.boolean().default(true),
  NEXT_PUBLIC_ENVIRONMENT: nodeEnvSchema,
  NEXT_PUBLIC_POSTHOG_HOST: optionalUrlString,
  NEXT_PUBLIC_POSTHOG_KEY: optionalNonEmptyString,
  NEXT_PUBLIC_SENTRY_DSN: optionalUrlString,
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: z.coerce.number().min(0).max(1).default(0.1),
  SENTRY_AUTH_TOKEN: optionalNonEmptyString,
  WEB_PORT: z.coerce.number().int().positive().default(3001)
});

export type WebConfig = z.infer<typeof webEnvSchema>;

export function getWebConfig(env: NodeJS.ProcessEnv = process.env): WebConfig {
  const parsed = parseEnv("web", webEnvSchema, env);

  if (parsed.NEXT_PUBLIC_ENVIRONMENT === "production") {
    const issues: string[] = [];

    if (!isSecureHttpUrl(parsed.NEXT_PUBLIC_APP_URL) || isLocalUrl(parsed.NEXT_PUBLIC_APP_URL)) {
      issues.push("NEXT_PUBLIC_APP_URL must point to the public HTTPS domain in production.");
    }

    if (!isSecureHttpUrl(parsed.NEXT_PUBLIC_API_URL) || isLocalUrl(parsed.NEXT_PUBLIC_API_URL)) {
      issues.push("NEXT_PUBLIC_API_URL must point to the public HTTPS API domain in production.");
    }

    if (parsed.NEXT_PUBLIC_CSP_REPORT_ONLY) {
      issues.push("NEXT_PUBLIC_CSP_REPORT_ONLY must be false in production.");
    }

    if (issues.length > 0) {
      throw new EnvValidationError("web", issues);
    }
  }

  return parsed;
}
