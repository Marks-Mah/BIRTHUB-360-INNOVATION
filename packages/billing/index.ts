import Stripe from "stripe";

export type Plan = { id: string; name: string; stripePriceId: string };
export type Subscription = { id: string; tenantId: string; status: string; planId: string };
export type UsageRecord = { tenantId: string; metric: string; quantity: number; createdAt: Date };
export type Invoice = { id: string; amount: number; currency: string; status: string };

export interface BillingProvider {
  createSubscription(tenantId: string, plan: Plan): Promise<Subscription>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  recordUsage(record: UsageRecord): Promise<void>;
  getInvoices(tenantId: string): Promise<Invoice[]>;
}

export class StripeProvider implements BillingProvider {
  private readonly stripe: Stripe;

  constructor(stripe: Stripe) {
    this.stripe = stripe;
  }

  async createSubscription(tenantId: string, plan: Plan): Promise<Subscription> {
    const customer = await this.stripe.customers.create({ metadata: { tenantId } });
    const subscription = await this.stripe.subscriptions.create({ customer: customer.id, items: [{ price: plan.stripePriceId }] });
    return { id: subscription.id, tenantId, status: subscription.status, planId: plan.id };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.stripe.subscriptions.cancel(subscriptionId);
  }

  async recordUsage(record: UsageRecord): Promise<void> {
    if (record.quantity < 0) throw new Error("invalid_usage_quantity");
  }

  async getInvoices(tenantId: string): Promise<Invoice[]> {
    const customers = await this.stripe.customers.list({ limit: 100 });
    const customer = customers.data.find((c) => c.metadata?.tenantId === tenantId);
    if (!customer) return [];
    const invoices = await this.stripe.invoices.list({ customer: customer.id, limit: 20 });
    return invoices.data.map((i) => ({ id: i.id, amount: i.amount_due, currency: i.currency || "usd", status: i.status || "open" }));
  }
}

export function meterUsage(store: UsageRecord[], tenantId: string, metric: string, quantity: number): UsageRecord {
  const record = { tenantId, metric, quantity, createdAt: new Date() };
  store.push(record);
  return record;
}
