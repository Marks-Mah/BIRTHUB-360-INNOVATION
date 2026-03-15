import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "@birthub/database";

import { getBillingSnapshot } from "../src/modules/billing/service.js";

function stubMethod(target: any, key: string, value: unknown): () => void {
  const original = target[key];
  target[key] = value;
  return () => {
    target[key] = original;
  };
}

void test("grace period keeps access on day +1 and locks on day +4 for past_due subscriptions", async () => {
  const base = new Date("2026-03-10T00:00:00.000Z");
  const realNow = Date.now;
  const restoreOrganization = stubMethod(prisma.organization, "findFirst", async () => ({
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
  }));

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
    restoreOrganization();
  }
});
