import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { prisma } from "@birthub/database";

import {
  exportDailyBillingInvoices,
  resolveBillingExportWindow
} from "./billingExport.js";
import { LocalBillingExportStorage } from "./billingExportStorage.js";

function stubMethod(target: object, key: string, value: unknown): () => void {
  const original = Reflect.get(target, key);
  Reflect.set(target, key, value);
  return () => {
    Reflect.set(target, key, original);
  };
}

void test("billing export window targets the previous UTC day", () => {
  const window = resolveBillingExportWindow(new Date("2026-03-15T02:15:00.000Z"));

  assert.equal(window.day, "2026-03-14");
  assert.equal(window.start.toISOString(), "2026-03-14T00:00:00.000Z");
  assert.equal(window.end.toISOString(), "2026-03-15T00:00:00.000Z");
});

void test("billing export groups invoices by organization and uploads deterministic JSON", async () => {
  const uploads: Array<{ body: string; key: string }> = [];
  const restoreInvoices = stubMethod(prisma.invoice, "findMany", async () => [
    {
      amountDueCents: 14900,
      amountPaidCents: 14900,
      createdAt: new Date("2026-03-14T04:00:00.000Z"),
      currency: "usd",
      dueDate: null,
      hostedInvoiceUrl: "https://stripe.example/inv-alpha-1",
      id: "invoice_alpha_1",
      invoicePdfUrl: "https://stripe.example/inv-alpha-1.pdf",
      organization: {
        id: "org_alpha",
        name: "Alpha Corp",
        slug: "alpha-corp",
        tenantId: "tenant_alpha"
      },
      organizationId: "org_alpha",
      periodEnd: new Date("2026-03-31T00:00:00.000Z"),
      periodStart: new Date("2026-03-01T00:00:00.000Z"),
      status: "paid",
      stripeInvoiceId: "in_alpha_1",
      subscription: {
        id: "sub_alpha",
        planId: "plan_professional",
        status: "active"
      }
    },
    {
      amountDueCents: 4900,
      amountPaidCents: 4900,
      createdAt: new Date("2026-03-14T07:00:00.000Z"),
      currency: "usd",
      dueDate: null,
      hostedInvoiceUrl: "https://stripe.example/inv-beta-1",
      id: "invoice_beta_1",
      invoicePdfUrl: "https://stripe.example/inv-beta-1.pdf",
      organization: {
        id: "org_beta",
        name: "Beta Corp",
        slug: "beta-corp",
        tenantId: "tenant_beta"
      },
      organizationId: "org_beta",
      periodEnd: new Date("2026-03-31T00:00:00.000Z"),
      periodStart: new Date("2026-03-01T00:00:00.000Z"),
      status: "paid",
      stripeInvoiceId: "in_beta_1",
      subscription: {
        id: "sub_beta",
        planId: "plan_starter",
        status: "active"
      }
    }
  ]);

  try {
    const result = await exportDailyBillingInvoices(new Date("2026-03-15T02:15:00.000Z"), {
      storage: {
        uploadJson: async (input) => {
          uploads.push({
            body: input.body,
            key: input.key
          });

          return {
            storageUrl: `mock://${input.key}`
          };
        }
      }
    });

    assert.equal(result.exports.length, 2);
    assert.deepEqual(
      uploads.map((upload) => upload.key),
      [
        "2026-03-14/tenant_alpha/org_alpha.json",
        "2026-03-14/tenant_beta/org_beta.json"
      ]
    );

    const alphaPayload = JSON.parse(uploads[0]!.body) as {
      invoiceCount: number;
      organization: {
        tenantId: string;
      };
      totals: {
        amountPaidCents: number;
      };
    };
    assert.equal(alphaPayload.invoiceCount, 1);
    assert.equal(alphaPayload.organization.tenantId, "tenant_alpha");
    assert.equal(alphaPayload.totals.amountPaidCents, 14900);
  } finally {
    restoreInvoices();
  }
});

void test("local billing export storage writes JSON artifacts to disk", async () => {
  const baseDir = mkdtempSync(join(tmpdir(), "billing-export-"));

  try {
    const storage = new LocalBillingExportStorage(baseDir);
    const result = await storage.uploadJson({
      body: JSON.stringify({
        ok: true
      }),
      contentType: "application/json",
      key: "2026-03-14/tenant_alpha/org_alpha.json"
    });

    assert.match(result.storageUrl, /org_alpha\.json$/);
    const written = JSON.parse(readFileSync(result.storageUrl, "utf8")) as { ok: boolean };
    assert.equal(written.ok, true);
  } finally {
    await rm(baseDir, { force: true, recursive: true });
  }
});
