import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

async function bootstrapSession(page: Parameters<typeof test>[0]["page"]) {
  await page.addInitScript(() => {
    localStorage.setItem("bh_csrf_token", "csrf-e2e");
    localStorage.setItem("bh_tenant_id", "birthhub-alpha");
    localStorage.setItem("bh_user_id", "owner.alpha@birthub.local");
  });
}

test("workflow editor evidence captures the React Flow canvas artifact", async ({ page }) => {
  await bootstrapSession(page);
  await page.route("**/api/v1/me", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        plan: {
          creditBalanceCents: 4200,
          currentPeriodEnd: "2026-04-13T00:00:00.000Z",
          hardLocked: false,
          isPaid: true,
          isWithinGracePeriod: false,
          name: "Professional",
          status: "active"
        }
      }),
      contentType: "application/json",
      status: 200
    });
  });

  await page.goto("/workflows/evidence/edit");
  await expect(page.getByText("Workflow Canvas - evidence")).toBeVisible();
  await page.getByRole("button", { name: "Organizar Canvas" }).click();
  await expect(page.getByText("Canvas valido. Pronto para salvar/publicar.")).toBeVisible();

  const outputPath = resolve(process.cwd(), "artifacts/workflows/workflow-editor-10-nodes.png");
  mkdirSync(resolve(process.cwd(), "artifacts/workflows"), { recursive: true });
  await page.locator("section").screenshot({
    path: outputPath
  });
});
