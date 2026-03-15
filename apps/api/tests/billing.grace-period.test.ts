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

void test("grace period keeps access on day +1 and locks on day +4 for past_due subscriptions", async () => {
  const base = new Date("2026-03-10T00:00:00.000Z");
  const realNow = Date.now;
  const restores = [
    stubMethod(prisma.organization, "findFirst", async () => ({
      id: "org_alpha",
      plan: {
        code: "professional",
        id: "plan_professional",
        limits: {
          features: {
            agents: true
          }
        },
        name: "Professional"
      },
      stripeCustomerId: "cus_alpha",
      subscriptions: [
        {
          currentPeriodEnd: null,
          gracePeriodEndsAt: null,
          id: "sub_alpha",
          status: "past_due",
          updatedAt: base
        }
      ],
      tenantId: "tenant_alpha"
    })),
    stubMethod(prisma.billingCredit, "aggregate", async () => ({
      _sum: {
        amountCents: 0
      }
    }))
  ];

  try {
    Date.now = () => base.getTime() + 24 * 60 * 60 * 1000;
    const dayPlusOne = await getBillingSnapshot("tenant_alpha", 3);
    assert.equal(dayPlusOne.hardLocked, false);
    assert.equal(dayPlusOne.isWithinGracePeriod, true);

    Date.now = () => base.getTime() + 4 * 24 * 60 * 60 * 1000;
    const dayPlusFour = await getBillingSnapshot("tenant_alpha", 3);
    assert.equal(dayPlusFour.hardLocked, true);
  } finally {
    Date.now = realNow;
    for (const restore of restores.reverse()) {
      restore();
    }
  }
});
