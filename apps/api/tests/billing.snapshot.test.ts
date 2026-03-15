import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@birthub/database";

import { getBillingSnapshot } from "../src/modules/billing/service.js";

function stubMethod(target: object, key: string, value: unknown): () => void {
  const original = Reflect.get(target, key);
  Reflect.set(target, key, value);
  return () => {
    Reflect.set(target, key, original);
  };
}

void test("billing snapshot includes downgrade/proration credit balance", async () => {
  const restores = [
    stubMethod(prisma.organization, "findFirst", async () => ({
      id: "org_alpha",
      plan: {
        code: "professional",
        id: "plan_professional",
        limits: {
          features: {
            agents: true,
            workflows: true
          }
        },
        name: "Professional"
      },
      stripeCustomerId: "cus_alpha",
      subscriptions: [
        {
          currentPeriodEnd: new Date("2026-03-31T00:00:00.000Z"),
          gracePeriodEndsAt: null,
          id: "sub_alpha",
          plan: {
            code: "professional",
            id: "plan_professional",
            limits: {
              features: {
                agents: true,
                workflows: true
              }
            },
            name: "Professional"
          },
          status: "active",
          updatedAt: new Date("2026-03-14T10:00:00.000Z")
        }
      ],
      tenantId: "tenant_alpha"
    })),
    stubMethod(prisma.billingCredit, "aggregate", async () => ({
      _sum: {
        amountCents: 4200
      }
    }))
  ];

  try {
    const snapshot = await getBillingSnapshot("tenant_alpha", 3);

    assert.equal(snapshot.creditBalanceCents, 4200);
    assert.equal(snapshot.plan.name, "Professional");
  } finally {
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});
