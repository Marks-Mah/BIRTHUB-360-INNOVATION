import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { defineConfig } from "@playwright/test";

const bundledPnpm = resolve(
  process.cwd(),
  ".tools/node-v22.22.1-win-x64/node_modules/corepack/dist/pnpm.js"
);
const pnpmCommand = existsSync(bundledPnpm)
  ? `node "${bundledPnpm}" --filter @birthub/web dev`
  : "pnpm --filter @birthub/web dev";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3001",
    trace: "retain-on-failure",
    video: "on",
  },
  webServer: {
    command: pnpmCommand,
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
