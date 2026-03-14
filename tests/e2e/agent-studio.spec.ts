import { expect, test } from "@playwright/test";

test.describe("Agent Studio critical flow", () => {
  test("create agent, run, inspect logs and edit prompt", async ({ page }) => {
    test.skip(true, "Requires @birthub/web running on port 3001 for Agent Studio E2E.");

    await page.goto("http://127.0.0.1:3001/agents");
    await expect(page.getByText("Agents")).toBeVisible();

    await page.getByRole("link", { name: "Overview" }).first().click();
    await expect(page.getByText("Prompt Editor")).toBeVisible();

    await page.getByRole("link", { name: "Run" }).click();
    await page.getByRole("button", { name: "Executar agente" }).click();
    await expect(page.getByText("Resultado em tempo real (SSE)")).toBeVisible();
  });
});
