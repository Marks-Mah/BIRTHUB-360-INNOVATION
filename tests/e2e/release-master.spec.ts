import { expect, test } from "@playwright/test";

async function bootstrapSession(page: Parameters<typeof test>[0]["page"]) {
  await page.addInitScript(() => {
    localStorage.setItem("bh_csrf_token", "csrf-e2e");
    localStorage.setItem("bh_tenant_id", "birthhub-alpha");
    localStorage.setItem("bh_user_id", "owner.alpha@birthub.local");
  });
}

test.describe("Release master smoke flow", () => {
  test("C1 home redirect, login and invite acceptance mock", async ({ page }) => {
    await page.route("**/api/v1/auth/login", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          mfaRequired: false,
          requestId: "req-e2e",
          session: {
            csrfToken: "csrf-e2e",
            expiresAt: "2026-03-14T00:00:00.000Z",
            id: "sess-e2e",
            refreshToken: "refresh-e2e",
            tenantId: "birthhub-alpha",
            token: "token-e2e",
            userId: "owner.alpha@birthub.local"
          }
        }),
        contentType: "application/json",
        status: 200
      });
    });
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
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page).toHaveURL(/\/settings\/security$/);
    await expect(page.getByText("Sessoes ativas")).toBeVisible();

    await page.goto("/invites/accept?token=invite-e2e");
    await expect(page.getByText("Convite aceito com sucesso.")).toBeVisible();
  });

  test("C2 pricing, checkout mock and billing visibility", async ({ page }) => {
    await bootstrapSession(page);
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
    await page.getByRole("button", { name: "Aceitar" }).click();
    await expect(page.getByText("Status atual:")).toBeVisible();
    await page.getByRole("button", { name: "Marcar todas como lidas" }).click();
  });

  test("C4 outputs feedback flow and local session cleanup", async ({ page }) => {
    await bootstrapSession(page);
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
