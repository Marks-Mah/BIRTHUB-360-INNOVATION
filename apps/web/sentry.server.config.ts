import { getWebConfig } from "@birthub/config";
import * as Sentry from "@sentry/nextjs";

const config = getWebConfig();

if (config.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: config.NEXT_PUBLIC_SENTRY_DSN,
    environment: config.NEXT_PUBLIC_ENVIRONMENT,
    tracesSampleRate: config.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
  });
}
