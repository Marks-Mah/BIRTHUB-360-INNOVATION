import { expect, test } from "@playwright/test";

async function bootstrapSession(page: Parameters<typeof test>[0]["page"]) {
  await page.addInitScript(() => {
    localStorage.setItem("bh_csrf_token", "csrf-e2e");
    localStorage.setItem("bh_tenant_id", "birthhub-alpha");
    localStorage.setItem("bh_user_id", "owner.alpha@birthub.local");
  });
}

test("workflow debugger and agent output feedback flow stay linked end-to-end", async ({ page }) => {
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
  await page.route("**/api/v1/executions/exec-feedback/feedback", async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        body: JSON.stringify({
          feedback: {
            expectedOutput: "Resposta corrigida",
            notes: "Corrigir contexto",
            rating: -1
          }
        }),
        contentType: "application/json",
        status: 200
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({
        feedback: {
          expectedOutput: "",
          notes: "",
          rating: 0
        }
      }),
      contentType: "application/json",
      status: 200
    });
  });

  await page.goto("/workflows/demo/runs");
  await expect(page.getByText("Workflow Runs - demo")).toBeVisible();
  await page.getByText("Condition").first().click();
  await expect(page.getByText('"result": true')).toBeVisible();
  await page.getByRole("button", { name: "Retry falha" }).click();
  await expect(page.getByText("Running").first()).toBeVisible();

  await page.goto("/outputs?executionId=exec-feedback");
  await expect(page.getByText("Outputs de Agente")).toBeVisible();
  await page.getByRole("button", { name: "Polegar para baixo" }).click();
  await page
    .getByPlaceholder("Descreva a resposta esperada para fortalecer o dataset RLHF.")
    .fill("Resposta corrigida");
  await page
    .getByPlaceholder("Ex.: alucinou numeros, errou contexto, ignorou ferramenta.")
    .fill("Corrigir contexto");
  await page.getByRole("button", { name: "Salvar feedback corretivo" }).click();
  await expect(page.getByText("O voto alimenta a taxa de aprovacao do marketplace")).toBeVisible();
});
