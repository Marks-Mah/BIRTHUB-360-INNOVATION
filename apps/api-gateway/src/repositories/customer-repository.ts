export interface Customer {
  id: string;
  tenantId: string;
  name: string;
  mrr: number;
  nps: number;
  openTickets: number;
  lastLoginDays: number;
  deletedAt?: string | null;
}

export interface CustomerHealth extends Customer {
  healthScore: number;
}

export interface CustomerTimelineEvent {
  id: string;
  customerId: string;
  tenantId: string;
  type: "ONBOARDING" | "USAGE" | "SUPPORT" | "BILLING";
  description: string;
  createdAt: string;
}

export class CustomerRepository {
  private readonly customers = new Map<string, Customer>();
  private readonly timelineEvents = new Map<string, CustomerTimelineEvent[]>();
  private seq = 0;

  constructor() {
    const customer: Customer = {
      id: "cust_1",
      tenantId: "tenant-a",
      name: "Acme",
      mrr: 2500,
      nps: 45,
      openTickets: 1,
      lastLoginDays: 2,
      deletedAt: null,
    };

    this.customers.set(customer.id, customer);
    this.timelineEvents.set(customer.id, [
      {
        id: "evt_1",
        customerId: customer.id,
        tenantId: customer.tenantId,
        type: "ONBOARDING",
        description: "Onboarding concluído",
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  async listWithHealthScore(tenantId: string, cursor?: string, limit = 20): Promise<CustomerHealth[]> {
    const arr = [...this.customers.values()].filter((c) => c.tenantId === tenantId && !c.deletedAt);
    const start = cursor ? Math.max(arr.findIndex((c) => c.id === cursor) + 1, 0) : 0;

    return arr.slice(start, start + limit).map((customer) => ({
      ...customer,
      healthScore: this.calculateHealthScore(customer),
    }));
  }

  async findById(tenantId: string, id: string): Promise<Customer | null> {
    const customer = this.customers.get(id);
    return customer && customer.tenantId === tenantId && !customer.deletedAt ? customer : null;
  }

  async softDelete(tenantId: string, id: string): Promise<boolean> {
    const customer = await this.findById(tenantId, id);
    if (!customer) return false;

    this.customers.set(id, { ...customer, deletedAt: new Date().toISOString() });
    return true;
  }

  async listTimeline(tenantId: string, customerId: string): Promise<CustomerTimelineEvent[]> {
    const customer = await this.findById(tenantId, customerId);
    if (!customer) return [];

    const events = this.timelineEvents.get(customerId) ?? [];
    return events.filter((event) => event.tenantId === tenantId);
  }

  async registerNps(tenantId: string, customerId: string, score: number, feedback?: string): Promise<void> {
    const customer = await this.findById(tenantId, customerId);
    if (!customer) return;

    this.customers.set(customerId, {
      ...customer,
      nps: score,
    });

    this.seq += 1;
    const event: CustomerTimelineEvent = {
      id: `evt_nps_${this.seq}`,
      customerId,
      tenantId,
      type: "USAGE",
      description: feedback ? `NPS ${score}: ${feedback}` : `NPS ${score}`,
      createdAt: new Date().toISOString(),
    };

    const current = this.timelineEvents.get(customerId) ?? [];
    this.timelineEvents.set(customerId, [event, ...current]);
  }

  private calculateHealthScore(customer: Customer): number {
    return Math.max(
      0,
      Math.min(
        100,
        Math.round(customer.nps * 0.5 + (30 - customer.openTickets * 8) + (30 - customer.lastLoginDays)),
      ),
    );
  }
}
