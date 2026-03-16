import { expect, test } from "@playwright/test";

import { bootstrapSession, mockDemoWorkflowRuns } from "./support";

test("billing premium flow unlocks paid workflow surfaces", async ({ page }) => {
  await bootstrapSession(page);
  await mockDemoWorkflowRuns(page);
  await page.route("**/api/v1/billing/checkout", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        url: "http://127.0.0.1:3001/billing/success"
      }),
      contentType: "application/json",
      status: 200
    });
  });
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
  await page.route("**/api/v1/billing/usage", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        usage: [
          { metric: "agent.tokens", quantity: 1800 },
          { metric: "workflow.runs", quantity: 44 }
        ]
      }),
      contentType: "application/json",
      status: 200
    });
  });
  await page.route("**/api/v1/billing/invoices", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            amountPaidCents: 14900,
            createdAt: "2026-03-13T00:00:00.000Z",
            currency: "usd",
            id: "inv_01",
            invoicePdfUrl: "https://example.com/invoice.pdf",
            status: "paid"
          }
        ]
      }),
      contentType: "application/json",
      status: 200
    });
  });

  await page.goto("/pricing");
  await page.getByRole("button", { name: "Escolher plano" }).first().click();
  await expect(page).toHaveURL(/\/billing\/success$/);
  await expect(page.getByText("Assinatura ativada com sucesso")).toBeVisible();

  await page.goto("/settings/billing");
  await expect(page.getByText("Plano atual, renovacao e consumo")).toBeVisible();
  await expect(page.getByText("Professional")).toBeVisible();
  await expect(page.getByText(/42,00/)).toBeVisible();

  await page.goto("/workflows/demo/edit");
  await expect(page).toHaveURL(/\/workflows\/demo\/edit$/);
  await expect(page.getByRole("button", { name: "Organizar Canvas" })).toBeVisible();

  await page.goto("/workflows/demo/runs");
  await expect(page.getByText("Workflow Runs - demo")).toBeVisible();
  await page.getByText("Condition").first().click();
  await expect(page.getByText('"result": true')).toBeVisible();
});
