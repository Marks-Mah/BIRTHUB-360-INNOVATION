import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3001",
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  // Server is already running manually in background on 3001
});
