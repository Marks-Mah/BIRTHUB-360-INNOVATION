import { expect, test } from "@playwright/test";

import {
  bootstrapSession,
  mockDemoWorkflowRuns,
  mockExecutionFeedback
} from "./support";

test.describe("Release master smoke flow", () => {
  test("C1 home redirect, session bootstrap and invite acceptance mock", async ({ page }) => {
    await page.route("**/api/v1/sessions", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          items: [
            {
              id: "sess-e2e",
              ipAddress: "127.0.0.1",
              lastActivityAt: "2026-03-13T12:00:00.000Z",
              userAgent: "Playwright Chromium"
            }
          ]
        }),
        contentType: "application/json",
        status: 200
      });
    });
    await page.route("**/api/v1/invites/accept", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          membershipId: "membership-e2e"
        }),
        contentType: "application/json",
        status: 200
      });
    });

    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Entrar na plataforma" })).toBeVisible();
    await bootstrapSession(page);
    await page.goto("/settings/security");
    await expect(page).toHaveURL(/\/settings\/security$/);
    await expect(page.getByRole("heading", { name: "Sessoes ativas" })).toBeVisible();

    await page.goto("/invites/accept?token=invite-e2e");
    await expect(page.getByText("Convite aceito com sucesso.")).toBeVisible();
  });

  test("C2 pricing, checkout mock and billing visibility", async ({ page }) => {
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
            isPaid: true,
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
    await expect(page.getByText("Node Sidebar")).toBeVisible();

    await page.goto("/workflows/demo/runs");
    await expect(page.getByText("Workflow Runs - demo")).toBeVisible();
    await page.getByText("Condition").first().click();
    await expect(page.getByText('"result": true')).toBeVisible();

    await page.goto("/billing/cancel");
    await expect(page.getByText("Nenhuma cobranca foi realizada")).toBeVisible();
  });

  test("C3 notification center and consent settings stay operational", async ({ page }) => {
    await bootstrapSession(page);
    await page.route("**/api/v1/notifications/preferences", async (route) => {
      if (route.request().method() === "PUT") {
        await route.fulfill({
          body: JSON.stringify({
            preferences: {
              cookieConsent: "ACCEPTED",
              emailNotifications: true,
              inAppNotifications: true,
              marketingEmails: false,
              pushNotifications: true
            }
          }),
          contentType: "application/json",
          status: 200
        });
        return;
      }

      await route.fulfill({
        body: JSON.stringify({
          preferences: {
            cookieConsent: "PENDING",
            emailNotifications: true,
            inAppNotifications: true,
            marketingEmails: false,
            pushNotifications: false
          }
        }),
        contentType: "application/json",
        status: 200
      });
    });
    await page.route("**/api/v1/notifications?*", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          items: [
            {
              content: "Seu agente terminou com sucesso.",
              createdAt: "2026-03-13T12:30:00.000Z",
              id: "notif-1",
              isRead: false,
              link: "/outputs?executionId=exec-01",
              type: "WORKFLOW_COMPLETED"
            }
          ],
          nextCursor: null,
          unreadCount: 1
        }),
        contentType: "application/json",
        status: 200
      });
    });
    await page.route("**/api/v1/notifications/read-all", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          readCount: 1
        }),
        contentType: "application/json",
        status: 200
      });
    });
    await page.route("**/api/v1/notifications/*/read", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          readCount: 1
        }),
        contentType: "application/json",
        status: 200
      });
    });

    await page.goto("/profile/notifications");
    await expect(page.getByText("Preferencias de notificacao")).toBeVisible();
    await expect(page.getByText("Seu agente terminou com sucesso.")).toBeVisible();
    await page.getByRole("button", { exact: true, name: "Aceitar" }).click();
    await expect(page.getByText("Status atual:")).toBeVisible();
    await page.getByRole("button", { name: "Marcar todas como lidas" }).click();
  });

  test("C4 outputs feedback flow and local session cleanup", async ({ page }) => {
    await bootstrapSession(page);
    await mockExecutionFeedback(page);

    await page.goto("/outputs?executionId=exec-feedback");
    await expect(page.getByText("Outputs de Agente")).toBeVisible();
    await expect(page.getByRole("button", { name: "Polegar para baixo" })).toBeEnabled();
    await page.getByRole("button", { name: "Polegar para baixo" }).click();
    await page
      .getByPlaceholder("Descreva a resposta esperada para fortalecer o dataset RLHF.")
      .fill("Resposta corrigida");
    await page
      .getByPlaceholder("Ex.: alucinou numeros, errou contexto, ignorou ferramenta.")
      .fill("Corrigir contexto");
    await page.getByRole("button", { name: "Salvar feedback corretivo" }).click();
    await expect(
      page.getByText("O voto alimenta a taxa de aprovacao do marketplace")
    ).toBeVisible();

    await page.evaluate(() => {
      localStorage.clear();
    });
    await expect
      .poll(() =>
        page.evaluate(() => ({
          csrf: localStorage.getItem("bh_csrf_token"),
          tenant: localStorage.getItem("bh_tenant_id"),
          user: localStorage.getItem("bh_user_id")
        }))
      )
      .toEqual({
        csrf: null,
        tenant: null,
        user: null
      });
  });
});
