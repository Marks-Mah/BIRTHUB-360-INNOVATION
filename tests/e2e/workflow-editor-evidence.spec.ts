import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

import { bootstrapSession, mockEvidenceWorkflowEditor } from "./support";

test("workflow editor evidence captures the React Flow canvas artifact", async ({ page }) => {
  await bootstrapSession(page);
  await mockEvidenceWorkflowEditor(page);
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
  await expect(page).toHaveURL(/\/workflows\/evidence\/edit$/);
  await expect(page.getByRole("button", { name: "Organizar Canvas" })).toBeVisible();
  await expect(page.getByText("Node Sidebar")).toBeVisible();
  await expect(page.locator(".react-flow__node")).toHaveCount(10);

  const outputPath = resolve(process.cwd(), "artifacts/workflows/workflow-editor-10-nodes.png");
  mkdirSync(resolve(process.cwd(), "artifacts/workflows"), { recursive: true });
  await page.locator("section").screenshot({
    path: outputPath
  });
});
