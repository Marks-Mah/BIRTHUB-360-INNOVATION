import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@birthub/database";
import express from "express";
import request from "supertest";

import { RequireFeature } from "../src/common/guards/feature.guard.js";
import { errorHandler } from "../src/middleware/error-handler.js";
import { requestContextMiddleware } from "../src/middleware/request-context.js";

function stubMethod(target: object, key: string, value: unknown): () => void {
  const original = Reflect.get(target, key);
  Reflect.set(target, key, value);
  return () => {
    Reflect.set(target, key, original);
  };
}

void test("pack install is blocked with 402 when agents feature is disabled by plan", async () => {
  const restores = [
    stubMethod(prisma.organization, "findFirst", async (args: { include?: { plan?: boolean } }) => {
      if (args.include?.plan) {
        return {
          id: "org_alpha",
          plan: {
            code: "starter",
            id: "plan_starter",
            limits: {
              features: {
                agents: false
              }
            },
            name: "Starter"
          },
          stripeCustomerId: null,
          subscriptions: [
            {
              currentPeriodEnd: null,
              gracePeriodEndsAt: null,
              id: "sub_1",
              status: "active",
              updatedAt: new Date("2026-03-13T10:00:00.000Z")
            }
          ],
          tenantId: "tenant_alpha"
        };
      }

      return {
        id: "org_alpha",
        slug: "birthhub-alpha",
        tenantId: "tenant_alpha"
      };
    }),
    stubMethod(prisma.billingCredit, "aggregate", async () => ({
      _sum: {
        amountCents: 0
      }
    }))
  ];

  try {
    const app = express();
    app.use(requestContextMiddleware);
    app.use((request, _response, next) => {
      request.context.authType = "session";
      request.context.organizationId = "org_alpha";
      request.context.sessionId = "session_alpha";
      request.context.tenantId = "tenant_alpha";
      request.context.userId = "user_alpha";
      next();
    });
    app.post("/guarded", RequireFeature("agents"), (_request, response) => {
      response.status(200).json({ ok: true });
    });
    app.use(errorHandler);

    const response = await request(app).post("/guarded").expect(402);

    assert.equal(response.body.title, "Payment Required");
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});
