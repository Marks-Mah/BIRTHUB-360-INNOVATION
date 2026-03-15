import { getWorkerConfig } from "@birthub/config";
import { prisma } from "@birthub/database";

import {
  createBillingExportStorage,
  type BillingExportStorage
} from "./billingExportStorage.js";

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function resolveBillingExportWindow(now: Date): {
  day: string;
  end: Date;
  start: Date;
} {
  const end = startOfUtcDay(now);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 1);

  return {
    day: start.toISOString().slice(0, 10),
    end,
    start
  };
}

export async function exportDailyBillingInvoices(
  now: Date,
  dependencies: {
    storage?: BillingExportStorage;
  } = {}
): Promise<{
  exportedAt: string;
  exports: Array<{
    invoiceCount: number;
    organizationId: string;
    storageUrl: string;
    tenantId: string;
  }>;
  window: {
    day: string;
    end: string;
    start: string;
  };
}> {
  const storage = dependencies.storage ?? createBillingExportStorage(getWorkerConfig());
  const window = resolveBillingExportWindow(now);
  const rows = await prisma.invoice.findMany({
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          tenantId: true
        }
      },
      subscription: {
        select: {
          id: true,
          planId: true,
          status: true
        }
      }
    },
    orderBy: [
      {
        tenantId: "asc"
      },
      {
        organizationId: "asc"
      },
      {
        createdAt: "asc"
      }
    ],
    where: {
      createdAt: {
        gte: window.start,
        lt: window.end
      }
    }
  });

  const grouped = new Map<string, typeof rows>();

  for (const row of rows) {
    const current = grouped.get(row.organizationId) ?? [];
    current.push(row);
    grouped.set(row.organizationId, current);
  }

  const exported = [];

  for (const [, invoices] of grouped) {
    const organization = invoices[0]?.organization;

    if (!organization) {
      continue;
    }

    const payload = {
      exportedAt: now.toISOString(),
      invoices: invoices.map((invoice) => ({
        amountDueCents: invoice.amountDueCents,
        amountPaidCents: invoice.amountPaidCents,
        createdAt: invoice.createdAt.toISOString(),
        currency: invoice.currency,
        dueDate: invoice.dueDate?.toISOString() ?? null,
        hostedInvoiceUrl: invoice.hostedInvoiceUrl,
        id: invoice.id,
        invoicePdfUrl: invoice.invoicePdfUrl,
        periodEnd: invoice.periodEnd?.toISOString() ?? null,
        periodStart: invoice.periodStart?.toISOString() ?? null,
        status: invoice.status,
        stripeInvoiceId: invoice.stripeInvoiceId,
        subscription: invoice.subscription
      })),
      invoiceCount: invoices.length,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        tenantId: organization.tenantId
      },
      totals: {
        amountDueCents: invoices.reduce((sum, invoice) => sum + invoice.amountDueCents, 0),
        amountPaidCents: invoices.reduce((sum, invoice) => sum + invoice.amountPaidCents, 0)
      },
      window: {
        day: window.day,
        end: window.end.toISOString(),
        start: window.start.toISOString()
      }
    };
    const key = `${window.day}/${organization.tenantId}/${organization.id}.json`;
    const result = await storage.uploadJson({
      body: JSON.stringify(payload, null, 2),
      contentType: "application/json",
      key
    });

    exported.push({
      invoiceCount: invoices.length,
      organizationId: organization.id,
      storageUrl: result.storageUrl,
      tenantId: organization.tenantId
    });
  }

  return {
    exportedAt: now.toISOString(),
    exports: exported,
    window: {
      day: window.day,
      end: window.end.toISOString(),
      start: window.start.toISOString()
    }
  };
}
