import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "retain-on-failure",
    video: "on",
  },
  webServer: {
    command: "pnpm --filter @birthub/web dev",
    url: "http://127.0.0.1:3001/health",
    reuseExistingServer: true,
    env: {
      NEXT_PUBLIC_API_URL: "http://127.0.0.1:3001",
      NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3001",
      NEXT_PUBLIC_ENVIRONMENT: "test",
      WEB_PORT: "3001"
    },
  },
});
