import { test, expect } from "@playwright/test";

test("critical routes are reachable", async ({ request }) => {
  const health = await request.get("/health");
  expect(health.ok()).toBeTruthy();

  const terms = await request.get("/legal/terms");
  expect(terms.ok()).toBeTruthy();

  const privacy = await request.get("/legal/privacy");
  expect(privacy.ok()).toBeTruthy();

  const pricing = await request.get("/pricing");
  expect(pricing.ok()).toBeTruthy();
});
