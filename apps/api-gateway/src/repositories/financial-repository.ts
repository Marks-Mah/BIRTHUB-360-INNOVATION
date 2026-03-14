export interface FinancialSnapshot {
  mrr: number;
  churnRate: number;
  delinquencyRate: number;
  projectedMrr30d: number;
}

export interface Invoice {
  id: string;
  tenantId: string;
  amountCents: number;
  currency: "BRL" | "USD";
  status: "OPEN" | "PAID" | "OVERDUE";
  deletedAt?: string | null;
}

export class FinancialRepository {
  private readonly invoices = new Map<string, Invoice>();

  constructor() {
    this.invoices.set("inv_1", {
      id: "inv_1",
      tenantId: "tenant-a",
      amountCents: 250000,
      currency: "BRL",
      status: "OPEN",
      deletedAt: null,
    });
  }

  async getSnapshot(tenantId: string): Promise<FinancialSnapshot> {
    const baseMrr = tenantId === "tenant-a" ? 120_000 : 60_000;
    const churnRate = 0.028;
    const delinquencyRate = 0.034;

    return {
      mrr: baseMrr,
      churnRate,
      delinquencyRate,
      projectedMrr30d: Math.round(baseMrr * (1 - churnRate) * (1 - delinquencyRate)),
    };
  }

  async listInvoices(tenantId: string, cursor?: string, limit = 20): Promise<Invoice[]> {
    const invoices = [...this.invoices.values()].filter((invoice) => invoice.tenantId === tenantId && !invoice.deletedAt);
    const start = cursor ? Math.max(invoices.findIndex((invoice) => invoice.id === cursor) + 1, 0) : 0;
    return invoices.slice(start, start + limit);
  }

  async softDeleteInvoice(tenantId: string, id: string): Promise<boolean> {
    const invoice = this.invoices.get(id);
    if (!invoice || invoice.tenantId !== tenantId || invoice.deletedAt) {
      return false;
    }

    this.invoices.set(id, { ...invoice, deletedAt: new Date().toISOString() });
    return true;
  }
}
